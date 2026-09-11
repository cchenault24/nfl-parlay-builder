import type { QuotaState } from './tiering'
import type { RateLimitInfo, RateLimitWindows } from './types'

// Three separate things can refuse the next run: the weekly generation quota,
// the daily fair-use valve and the hourly one. Which of them a user is actually
// near is the only one worth saying out loud, so this picks it.

export type AllowanceWindow = 'week' | 'day' | 'hour'

function isWindow(value: unknown): value is RateLimitInfo {
  const window = value as Partial<RateLimitInfo> | null
  return (
    !!window &&
    typeof window.remaining === 'number' &&
    typeof window.resetTime === 'string'
  )
}

/**
 * A rate-limit payload, or null when it is not the shape this client
 * understands.
 *
 * Every read of these windows goes through here. The API served a single flat
 * window before it served two, so a client newer than its server — or one
 * reading state persisted by an older build — gets the old shape, and reaching
 * straight into `.day.remaining` crashed the Build screen outright. Treating an
 * unrecognised payload as "allowance unknown" degrades the cost line to "Uses 3
 * runs." instead of taking the screen down.
 */
export function asRateLimitWindows(value: unknown): RateLimitWindows | null {
  const windows = value as Partial<RateLimitWindows> | null
  if (!windows || !isWindow(windows.hour) || !isWindow(windows.day)) {
    return null
  }
  return { hour: windows.hour, day: windows.day }
}

export interface Allowance {
  remaining: number
  window: AllowanceWindow
  resetsAt: string
}

const LABELS: Record<AllowanceWindow, string> = {
  week: 'this week',
  day: 'today',
  hour: 'this hour',
}

export function allowanceLabel(window: AllowanceWindow): string {
  return LABELS[window]
}

/**
 * The allowance that will run out first.
 *
 * Ties go to the longer window, because it is the harder constraint: two runs
 * left this week and two left this hour are not the same problem, and only one
 * of them is fixed by waiting.
 *
 * Returns null when nothing bounds the user — an unlimited weekly quota with no
 * rate-limit reading yet, which is what a Pro client looks like before its first
 * response lands. Callers say nothing rather than guessing a number.
 */
export function bindingAllowance(params: {
  quota: QuotaState | undefined
  rateLimit: RateLimitWindows | null | undefined
}): Allowance | null {
  const { quota } = params
  const rateLimit = asRateLimitWindows(params.rateLimit)
  const candidates: Allowance[] = []

  if (quota && quota.limit !== null && quota.remaining !== null) {
    candidates.push({
      remaining: quota.remaining,
      window: 'week',
      resetsAt: quota.resetsAt,
    })
  }
  if (rateLimit) {
    candidates.push({
      remaining: rateLimit.day.remaining,
      window: 'day',
      resetsAt: rateLimit.day.resetTime,
    })
    candidates.push({
      remaining: rateLimit.hour.remaining,
      window: 'hour',
      resetsAt: rateLimit.hour.resetTime,
    })
  }
  if (candidates.length === 0) {
    return null
  }

  // `candidates` is already in longest-window-first order, and `reduce` keeps
  // the incumbent on a tie — which is the tie-break above, not an accident.
  return candidates.reduce((binding, candidate) =>
    candidate.remaining < binding.remaining ? candidate : binding
  )
}

// "12m 30s" until the given instant, or an empty string when there is nothing
// to count down to.
export function timeUntil(resetsAt: string | undefined): string {
  if (!resetsAt) {
    return ''
  }
  const diff = new Date(resetsAt).getTime() - Date.now()
  if (Number.isNaN(diff)) {
    return ''
  }
  if (diff <= 0) {
    return 'Reset available'
  }
  const minutes = Math.floor(diff / 60_000)
  const seconds = Math.floor((diff % 60_000) / 1000)
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

/**
 * What to tell a user whose allowance has run out, or null when there is
 * nothing to say.
 *
 * Weekly exhaustion returns null deliberately: that one is a quota with its own
 * treatment — an upsell, not a countdown — and waiting will not clear it.
 */
export function allowanceExhaustedCopy(
  allowance: Allowance | null
): { title: string; message: string } | null {
  if (!allowance || allowance.remaining > 0 || allowance.window === 'week') {
    return null
  }
  const where = allowanceLabel(allowance.window)
  return {
    title: allowance.window === 'day' ? 'Daily run limit reached' : 'Hourly limit reached',
    message: `You've used all your parlay generations for ${where}.`,
  }
}
