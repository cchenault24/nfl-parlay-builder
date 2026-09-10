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

// Why a leg has no closing-line value, when it doesn't.
export type ClvUnavailable = 'unanchored' | 'line_moved' | 'no_market'

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
  unavailable?: ClvUnavailable
}

export interface ParlayClosingLines {
  capturedAt: string
  bookmaker: string | null
  // Positionally aligned with the parlay's legs.
  legs: LegClosingLine[]
  // Mean of the legs that could be judged; null when none could.
  averageClvPoints: number | null
}
