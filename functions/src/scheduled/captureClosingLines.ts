import { onSchedule } from 'firebase-functions/v2/scheduler'
import { mergeClosingLines, type StoredLeg } from '../clv/computeClv'
import { db } from '../firebase'
import { parlayGameIds, type StoredParlay } from '../grading/sweep'
import type { ParlayClosingLines } from '../grading/types'
import { log } from '../observability/logger'
import { getSeasonSchedule } from '../providers/espn/client'
import type { ScheduleGame } from '../providers/espn/types'
import { getOddsForGame } from '../providers/odds/client'
import { getCurrentSeason } from '../utils/season'

// How close to kickoff a game has to be for its current price to count as
// the closing one. Wide enough that a run can be missed without losing the
// capture, narrow enough that the line is genuinely near its final state.
const CAPTURE_WINDOW_MS = 45 * 60_000

type ParlayWithClosing = Omit<StoredParlay, 'legs'> & {
  legs?: StoredLeg[]
  closingLines?: ParlayClosingLines
}

// Every parlay that draws on this game. Two queries because two spellings of
// the field exist in stored data: `gameIds` on everything saved since parlays
// could span games, and a single `gameId` on everything saved before that.
// Both are indexed single-field lookups, and the result set is bounded by the
// game rather than by time — a game is played once.
async function parlaysForGame(gameId: string) {
  const parlays = db().collection('parlays')
  const [byList, byLegacyField] = await Promise.all([
    parlays.where('gameIds', 'array-contains', gameId).get(),
    parlays.where('gameId', '==', gameId).get(),
  ])
  const unique = new Map(
    [...byList.docs, ...byLegacyField.docs].map(doc => [doc.id, doc])
  )
  return [...unique.values()]
}

async function captureGame(game: ScheduleGame): Promise<number> {
  // A missing snapshot still gets written: it records that the market was
  // unreadable at kickoff, which is different from never having looked.
  const closingOdds = await getOddsForGame(game).catch(() => null)
  let captured = 0

  for (const doc of await parlaysForGame(game.gameId)) {
    const data = doc.data() as ParlayWithClosing
    if (!Array.isArray(data.legs) || data.closingLines?.complete) {
      continue
    }
    // Idempotent: a game already priced on an earlier sweep is left alone, so
    // a second pass inside the window cannot overwrite a real close.
    if (data.closingLines?.capturedGameIds?.includes(game.gameId)) {
      continue
    }
    const closingLines = mergeClosingLines({
      legs: data.legs,
      gameIds: parlayGameIds(data),
      game,
      closingOdds,
      existing: data.closingLines,
    })
    await doc.ref.set({ closingLines }, { merge: true })
    captured++
  }

  return captured
}

/**
 * Records where the market finished for each saved parlay, so the price it was
 * built on can be judged against the close. This has to happen before kickoff —
 * once a game starts the market is gone, and there is no way to recover what it
 * settled at.
 *
 * Driven by the *games* about to kick off rather than by the parlays: a parlay
 * spanning several games has no single close, and its legs have to be priced as
 * their own games reach theirs. One parlay is therefore written once per game it
 * covers, and marked complete when the last of them lands.
 */
export const captureClosingLinesSweep = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'America/New_York',
    region: 'us-central1',
    timeoutSeconds: 540,
    retryCount: 0,
    secrets: ['ODDS_API_KEY'],
  },
  async () => {
    const now = Date.now()
    const schedule = await getSeasonSchedule(getCurrentSeason())
    const closing = schedule.filter(game => {
      const kickoff = Date.parse(game.dateTime)
      return (
        game.status === 'scheduled' &&
        kickoff >= now &&
        kickoff <= now + CAPTURE_WINDOW_MS
      )
    })

    let captured = 0
    for (const game of closing) {
      captured += await captureGame(game)
    }
    log.info('scheduled.clv.captured', { games: closing.length, parlays: captured })
  }
)
