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
  // What Pro grants, whatever tier this user is on — so a locked control and
  // the upgrade sheet can say what upgrading actually buys without the client
  // restating a limit the server owns.
  //
  // Optional because the clients and the API deploy separately: a build that
  // ships ahead of the server has to render without it rather than throw.
  proCapabilities?: TierCapabilities
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

// What the user picked. Every field is optional in the sense that it may hold a
// value their plan no longer allows: settings persist, and a subscription can
// lapse or be refunded while they are sitting on the Build tab.
export interface RunSettingsChoice {
  riskLevel: RiskLevel
  legCount: number | undefined
  bookmaker: string | undefined
}

// What may actually go on the wire. `legCount` and `bookmaker` are omitted
// rather than defaulted when there is nothing legitimate to send, so the server
// applies its own default instead of the client inventing one.
export interface RunSettingsRequest {
  riskLevel: RiskLevel
  legCount: number | undefined
  bookmaker: string | undefined
}

/**
 * Clamps a user's stored run settings to what their plan actually permits.
 *
 * This is the single place the rule lives, and it is applied on the request
 * path rather than only in the label. The server refuses a gated value outright
 * — 403 `sportsbook_locked`, `leg_count_locked`, or the risk-level refusal — so
 * a client that renders the clamped value while sending the raw one produces a
 * run that fails every time, showing a setting it is not asking for. A Free
 * user tapping the sportsbook chip already shown as selected is enough to do
 * it, because the pinned book is displayed as selected and is not locked.
 *
 * Free must send **nothing** for `bookmaker`. The server's own priority order
 * already starts at the pinned book, so the UI names it and the server picks
 * it; sending the name to match the label is what breaks the run.
 *
 * With capabilities not yet loaded every gated field is dropped, matching the
 * fail-closed default the option lists use: briefly sending an unpermitted
 * value would fail the run outright, while sending nothing is always valid.
 */
export function normalizeRunSettings(
  capabilities: TierCapabilities | undefined,
  chosen: RunSettingsChoice
): RunSettingsRequest {
  const allowedRisks = capabilities?.riskLevels ?? ['moderate']
  const legs = capabilities?.legCount

  return {
    riskLevel: allowedRisks.includes(chosen.riskLevel)
      ? chosen.riskLevel
      : (allowedRisks[0] ?? 'moderate'),
    legCount:
      legs === undefined
        ? undefined
        : chosen.legCount === undefined
          ? legs.default
          : Math.min(Math.max(chosen.legCount, legs.min), legs.max),
    bookmaker: capabilities?.chooseSportsbook ? chosen.bookmaker || undefined : undefined,
  }
}
