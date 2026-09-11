import type { LegOutcome, ParlayOutcome } from './gradeLeg'

// Persisted onto a `parlays/{id}` Firestore doc once computed. Absent
// entirely means "never checked yet"; 'pending' means checked but the game
// isn't final; a final result is permanent, so 'graded' is never recomputed.
export interface ParlayGrading {
  status: 'pending' | 'graded'
  gradedAt?: string
  legOutcomes?: LegOutcome[]
  parlayOutcome?: ParlayOutcome
}

// Why a leg has no closing-line value, when it doesn't. `not_yet_closed` is the
// only one that is temporary: a cross-game parlay's legs close at their own
// games' kickoffs, so the earlier ones are priced while the later ones wait.
export type ClvUnavailable =
  | 'unanchored'
  | 'line_moved'
  | 'no_market'
  | 'not_yet_closed'

// What the book was showing for a leg just before kickoff, captured so the
// price the parlay was built on can be judged against where the market
// finished. Beating the close is the standard read on whether a pick had an
// edge, and it says something useful after a handful of bets, where win-loss
// takes dozens.
export interface LegClosingLine {
  closingLine: number | null
  closingOdds: number | null
  // Implied-probability points gained versus the close: positive means the
  // price beat where the market settled. Null when it can't be judged.
  clvPoints: number | null
  // Per leg rather than per parlay: a cross-game parlay's games can resolve to
  // different books, so one name at the top would be wrong for some of them.
  bookmaker: string | null
  unavailable?: ClvUnavailable
}

export interface ParlayClosingLines {
  // The most recent capture. A cross-game parlay is captured once per game.
  capturedAt: string
  // Which of the parlay's games have been priced. The sweep reads this to know
  // what is left, and it is what makes a capture idempotent.
  capturedGameIds: string[]
  // Every game in the parlay has been captured; nothing more will change.
  complete: boolean
  // Positionally aligned with the parlay's legs.
  legs: LegClosingLine[]
  // Mean of the legs that could be judged so far; null when none could.
  averageClvPoints: number | null
}
