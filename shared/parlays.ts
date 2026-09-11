import type { GameSummary, GeneratedParlay, ParlayLeg } from './types'

// The one place a Firestore document becomes a `GeneratedParlay`.
//
// Saved parlays outlive every shape change the app makes, so this migrates
// forward rather than assuming the current one: field renames, a leg that
// predates `anchored`, and a `gameSummary` written before a parlay could span
// more than one game. It was duplicated in both clients with a note to extract
// it if they ever drifted — the multi-game reshape is that moment, and history
// rendering differently on web and iOS is not a difference anyone would choose.

type StoredLeg = Partial<ParlayLeg> & {
  type?: ParlayLeg['betType']
  pick?: string
}

// The pre-multi-game analysis: one game's read, stored unwrapped.
type LegacyGameSummary = {
  matchupSummary?: string
  keyFactors?: string[]
  gamePrediction?: {
    winner?: string
    projectedScore?: { home?: number; away?: number }
    winProbability?: number
  }
}

export type StoredParlay = Partial<
  Omit<GeneratedParlay, 'legs' | 'gameSummary'>
> & {
  legs?: StoredLeg[]
  gameSummary?: GameSummary | LegacyGameSummary
  estimatedOdds?: number | string
  // Written by every client before cross-game parlays existed, and still on
  // every document saved up to that point.
  gameId?: string
}

function num(value: unknown): number {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function isCurrentSummary(value: unknown): value is GameSummary {
  return Array.isArray((value as GameSummary | undefined)?.games)
}

function toGameSummary(
  stored: StoredParlay['gameSummary'],
  gameId: string
): GameSummary {
  if (isCurrentSummary(stored)) {
    return { games: stored.games, slateSummary: stored.slateSummary ?? null }
  }
  const prediction = stored?.gamePrediction
  return {
    // A parlay saved before this was a list was, by definition, about one game.
    games: [
      {
        gameId,
        matchupSummary: stored?.matchupSummary ?? '',
        keyFactors: stored?.keyFactors ?? [],
        gamePrediction: {
          winner: prediction?.winner ?? '',
          projectedScore: {
            home: num(prediction?.projectedScore?.home),
            away: num(prediction?.projectedScore?.away),
          },
          winProbability: num(prediction?.winProbability),
        },
      },
    ],
    slateSummary: null,
  }
}

// `parlayId` is always the Firestore doc id, not the stored field — the same
// generated parlay (same runId) saved twice would otherwise carry the same
// `parlayId` in both docs, breaking list identity in history.
export function normalizeStoredParlay(
  data: StoredParlay,
  docId: string
): GeneratedParlay {
  // Saves from before cross-game parlays existed name a single `gameId`. That
  // field is no longer written, but documents carrying it outlive the change —
  // normalizing it here is the whole job of this function.
  const gameIds = data.gameIds?.length
    ? data.gameIds
    : data.gameId
      ? [data.gameId]
      : []
  return {
    parlayId: docId,
    gameIds,
    gameContext: data.gameContext ?? '',
    week: typeof data.week === 'number' ? data.week : 0,
    gameDateTime: data.gameDateTime ?? '',
    legs: (data.legs ?? []).map(leg => ({
      betType: leg.betType ?? leg.type ?? 'moneyline',
      team: leg.team ?? '',
      player: leg.player?.trim() ? leg.player : null,
      selection: leg.selection ?? leg.pick ?? '',
      line: leg.line ?? null,
      side: leg.side ?? null,
      odds: num(leg.odds),
      confidence: num(leg.confidence),
      reasoning: leg.reasoning ?? '',
      // Saves from before this field existed were made under the old
      // all-or-nothing anchoring rule, so every leg they contain was, by
      // definition, anchored.
      anchored: leg.anchored ?? true,
    })),
    combinedOdds: num(data.combinedOdds ?? data.estimatedOdds),
    parlayConfidence: num(data.parlayConfidence),
    gameSummary: toGameSummary(data.gameSummary, gameIds[0] ?? ''),
    model: data.model ?? 'unknown',
    grading: data.grading,
    closingLines: data.closingLines,
    shareId: data.shareId,
  }
}

// What a saved parlay's status chip says. "Pending" was the grading status
// verbatim, and it meant nothing to a reader: before kickoff the parlay is
// simply upcoming, and after it the sweep either graded it or could not.
export type ParlayStatus =
  | { label: 'Won' | 'Lost' | 'Push' | 'Partial'; tone: 'success' | 'error' | 'muted' | 'warning' }
  | { label: 'Upcoming'; tone: 'info' }
  | { label: 'Not graded'; tone: 'muted' }

const OUTCOME_LABEL = {
  won: { label: 'Won', tone: 'success' },
  lost: { label: 'Lost', tone: 'error' },
  push: { label: 'Push', tone: 'muted' },
  partial: { label: 'Partial', tone: 'warning' },
} as const

export function parlayStatus(
  parlay: Pick<GeneratedParlay, 'grading' | 'gameDateTime'>,
  now: number = Date.now()
): ParlayStatus {
  const outcome = parlay.grading?.status === 'graded' ? parlay.grading.parlayOutcome : undefined
  if (outcome) {
    return OUTCOME_LABEL[outcome]
  }
  const kickoff = Date.parse(parlay.gameDateTime)
  if (!Number.isNaN(kickoff) && kickoff > now) {
    return { label: 'Upcoming', tone: 'info' }
  }
  return { label: 'Not graded', tone: 'muted' }
}
