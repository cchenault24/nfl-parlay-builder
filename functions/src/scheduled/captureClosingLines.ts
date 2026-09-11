import { onSchedule } from 'firebase-functions/v2/scheduler'
import { computeClosingLines, type StoredLeg } from '../clv/computeClv'
import { db } from '../firebase'
import { parlayGameIds, type StoredParlay } from '../grading/sweep'
import type { ParlayClosingLines } from '../grading/types'
import { log } from '../observability/logger'
import { getGame } from '../providers/espn/client'
import { getOddsForGame } from '../providers/odds/client'
import { getSeasonForDate } from '../utils/season'

// How close to kickoff a game has to be for its current price to count as
// the closing one. Wide enough that a run can be missed without losing the
// capture, narrow enough that the line is genuinely near its final state.
const CAPTURE_WINDOW_MS = 45 * 60_000

type ParlayWithClosing = Omit<StoredParlay, 'legs'> & {
  legs?: StoredLeg[]
  closingLines?: ParlayClosingLines
}

// Records where the market finished for each saved parlay, so the price it
// was built on can be judged against the close. This has to happen before
// kickoff — once a game starts the market is gone, and there is no way to
// recover what it settled at.
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
    const snap = await db()
      .collection('parlays')
      .where('gameDateTime', '>=', new Date(now).toISOString())
      .where('gameDateTime', '<=', new Date(now + CAPTURE_WINDOW_MS).toISOString())
      .get()

    // One game backs many parlays, so read its odds once for all of them.
    const byGame = new Map<string, typeof snap.docs>()
    let skippedCrossGame = 0
    for (const doc of snap.docs) {
      const data = doc.data() as ParlayWithClosing
      if (data.closingLines || !Array.isArray(data.legs)) {
        continue
      }
      const gameIds = parlayGameIds(data)
      // A cross-game parlay has no single close. Each of its legs closes at its
      // own game's kickoff, and this sweep is keyed on one kickoff time, so
      // capturing here would record a price taken hours before the later games
      // actually closed. `closingLines` stays absent — already a supported
      // state, and the only honest one until a per-game capture exists.
      if (gameIds.length !== 1) {
        skippedCrossGame += gameIds.length > 1 ? 1 : 0
        continue
      }
      const [gameId] = gameIds
      byGame.set(gameId, [...(byGame.get(gameId) ?? []), doc])
    }

    let captured = 0
    for (const [gameId, docs] of byGame) {
      const first = docs[0].data() as ParlayWithClosing
      const season = getSeasonForDate(new Date(first.gameDateTime as string))
      const game = await getGame(season, gameId)
      if (!game) {
        continue
      }
      // A missing snapshot still gets written: it records that the market was
      // unreadable at kickoff, which is different from never having looked.
      const odds = await getOddsForGame(game).catch(() => null)
      for (const doc of docs) {
        const data = doc.data() as ParlayWithClosing
        const closingLines = computeClosingLines(data.legs ?? [], game, odds)
        await doc.ref.set({ closingLines }, { merge: true })
        captured++
      }
    }
    log.info('scheduled.clv.captured', {
      games: byGame.size,
      parlays: captured,
      skippedCrossGame,
    })
  }
)
