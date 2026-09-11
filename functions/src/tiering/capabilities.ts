import { MAX_GAMES_PER_RUN, type RiskLevel } from '../agent/shared/schemas'

// The authoritative tier definition. Clients never hardcode these numbers —
// /entitlements hands them over — so this file is the only place a limit is
// stated and a change here needs no client deploy.

export type Tier = 'free' | 'pro'

export interface TierCapabilities {
  generationsPerWeek: number | null
  riskLevels: RiskLevel[]
  legCount: { min: number; max: number; default: number }
  // How many games one run may draw legs from. 1 means single-game only, which
  // is what makes cross-game a Pro feature without needing a separate flag.
  maxGamesPerRun: number
  playerProps: boolean
  chooseSportsbook: boolean
  historyDepth: number | null
  rejectedLegs: boolean
  performanceRecord: boolean
  lineMoveAlerts: boolean
}

// Free's leg count is not a cap anyone picked. `validate` permits at most one
// leg per market and a single game has exactly three, so without player props a
// free parlay is structurally three legs. Props are what make 2-6 possible.
//
// `default` is what a run gets when the caller does not ask for a leg count,
// and it is three for both tiers. It is stated separately from `min` because
// Pro's minimum is 2 and defaulting to a minimum produced a two-leg prompt that
// the model — asked for three-leg parlays everywhere else — answered with three
// legs, which `validate` then rejected. Every default Pro generation failed.
const FREE: TierCapabilities = {
  generationsPerWeek: 2,
  riskLevels: ['moderate'],
  legCount: { min: 3, max: 3, default: 3 },
  maxGamesPerRun: 1,
  playerProps: false,
  chooseSportsbook: false,
  historyDepth: 10,
  rejectedLegs: false,
  performanceRecord: false,
  lineMoveAlerts: false,
}

const PRO: TierCapabilities = {
  generationsPerWeek: null,
  riskLevels: ['conservative', 'moderate', 'aggressive'],
  legCount: { min: 2, max: 6, default: 3 },
  maxGamesPerRun: MAX_GAMES_PER_RUN,
  playerProps: true,
  chooseSportsbook: true,
  historyDepth: null,
  rejectedLegs: true,
  performanceRecord: true,
  lineMoveAlerts: true,
}

export function capabilitiesFor(tier: Tier): TierCapabilities {
  return tier === 'pro' ? PRO : FREE
}

// Pro's "unlimited" is bounded by silent fair-use valves that are deliberately
// never surfaced as a quota. Naming them here keeps the numbers in one place.
//
// The hourly figure bounds a burst. It does not bound a month: 20/hr permits
// 14,400 runs, about $383 of model spend against $8.49 of net revenue, so on
// its own it bounded nothing at all.
//
// The daily figure is what actually holds. At the measured $0.0266 a run, 10/day
// is 300 runs a month costing $7.98 — still inside $8.49 net on Apple at the
// absolute ceiling. 15/day would lose $3.48 there. Nobody watching a 19-39s
// timeline reaches ten in a day, so this should never be felt; it exists so the
// worst case is bounded rather than trusted.
export const PRO_RUNS_PER_HOUR = 20
export const PRO_RUNS_PER_DAY = 10

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function easternParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return { weekday: get('weekday'), date: `${get('year')}-${get('month')}-${get('day')}` }
}

// Quota buckets run Tuesday→Monday to match the NFL week. A rolling 7-day window
// would lock a Sunday user out the following Sunday, which reads as the product
// being broken rather than as a weekly allowance.
//
// The boundary is Eastern regardless of where the caller sits: it has to be the
// same instant for a user in Los Angeles and for the API in us-central1, or a
// run counts against different weeks depending on who asks. Anchoring on UTC
// midnight of the *Eastern* calendar date keeps the arithmetic clear of DST —
// only the date label matters, and it is stable across both transitions.
export function quotaWindowStart(now: Date = new Date()): string {
  const { weekday, date } = easternParts(now)
  const sinceTuesday = (WEEKDAYS.indexOf(weekday) - 2 + 7) % 7
  return new Date(Date.parse(`${date}T00:00:00Z`) - sinceTuesday * DAY_MS)
    .toISOString()
    .slice(0, 10)
}

// The instant the current bucket rolls over, so a client can render "resets
// Tuesday" without re-deriving the NFL week boundary itself.
export function quotaWindowEnd(now: Date = new Date()): string {
  return new Date(
    Date.parse(`${quotaWindowStart(now)}T00:00:00Z`) + 7 * DAY_MS
  ).toISOString()
}
