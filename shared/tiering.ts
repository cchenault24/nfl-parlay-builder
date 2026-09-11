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
  legCount: { min: number; max: number; default: number }
  // How many games one run may draw legs from. 1 is single-game only; above
  // that the client may offer a cross-game parlay.
  maxGamesPerRun: number
  playerProps: boolean
  chooseSportsbook: boolean
  historyDepth: number | null
  rejectedLegs: boolean
  performanceRecord: boolean
  lineMoveAlerts: boolean
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

export interface Sportsbook {
  key: string
  title: string
}

export interface Entitlements {
  tier: Tier
  capabilities: TierCapabilities
  quota: QuotaState
  // The books a Pro user may price against. Served by the API so adding one
  // does not need an app release on two platforms.
  sportsbooks: Sportsbook[]
  // Whether Pro can actually be bought right now. Billing ships disabled until
  // its credentials exist; a client that cannot know this renders an Upgrade
  // button that only fails when pressed.
  billingAvailable: { stripe: boolean; apple: boolean }
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
