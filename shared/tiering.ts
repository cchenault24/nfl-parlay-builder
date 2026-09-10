import type { RiskLevel } from './types'

// The wire contract for tiering. Types only, deliberately: `functions/` compiles
// with rootDir "src" and Firebase packages only that directory, so it cannot
// import this file. Duplicating the limits here to work around that would let
// the server enforce one set of numbers while the UI advertises another, so the
// server owns the values outright and hands them over in /entitlements. Clients
// render what they are told and never hardcode a limit.

export type Tier = 'free' | 'pro'

// Per-feature budgets rather than an `isPro` boolean. Full-slate mode generates
// ~16 runs per click and will need a budget of its own; a boolean would have to
// be unpicked to add one. `null` means unbounded.
export interface TierCapabilities {
  generationsPerWeek: number | null
  riskLevels: RiskLevel[]
  legCount: { min: number; max: number }
  playerProps: boolean
  chooseSportsbook: boolean
  historyDepth: number | null
  rejectedLegs: boolean
  performanceRecord: boolean
  lineMoveAlerts: boolean
  exportResultCard: boolean
}

export interface QuotaState {
  used: number
  limit: number | null
  // null whenever `limit` is null — unbounded, not "none left".
  remaining: number | null
  // Start of the current Tuesday→Monday bucket, as YYYY-MM-DD in America/New_York.
  windowStart: string
  // When the bucket rolls over, for rendering "resets Tuesday" without the
  // client having to re-derive the NFL week boundary.
  resetsAt: string
}

export interface Entitlements {
  tier: Tier
  capabilities: TierCapabilities
  quota: QuotaState
  // Present only for a Pro user, and only when the subscription is set to end.
  // Free retains all data and regains it on resubscribe, so this is a view
  // restriction date, never a deletion date.
  accessEndsAt?: string
}

export function canUseRiskLevel(
  capabilities: TierCapabilities,
  risk: RiskLevel
): boolean {
  return capabilities.riskLevels.includes(risk)
}

export function hasGenerationsLeft(quota: QuotaState): boolean {
  return quota.remaining === null || quota.remaining > 0
}
