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
