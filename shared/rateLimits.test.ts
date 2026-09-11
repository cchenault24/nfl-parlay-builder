import { describe, expect, it } from 'vitest'
import type { QuotaState } from './tiering'
import type { RateLimitInfo, RateLimitWindows } from './types'
import {
  allowanceLabel,
  asRateLimitWindows,
  bindingAllowance,
  timeUntil,
} from './rateLimits'


const RESETS = {
  week: '2026-10-13T00:00:00.000Z',
  day: '2026-10-12T00:00:00.000Z',
  hour: '2026-10-11T18:00:00.000Z',
}

const window = (remaining: number, total: number, resetTime: string): RateLimitInfo => ({
  remaining,
  total,
  resetTime,
  currentCount: total - remaining,
})

const limits = (dayRemaining: number, hourRemaining = 20): RateLimitWindows => ({
  hour: window(hourRemaining, 20, RESETS.hour),
  day: window(dayRemaining, 10, RESETS.day),
})

const freeQuota = (remaining: number): QuotaState => ({
  used: 2 - remaining,
  limit: 2,
  remaining,
  windowStart: '2026-10-06',
  resetsAt: RESETS.week,
})

const proQuota: QuotaState = {
  used: 40,
  limit: null,
  remaining: null,
  windowStart: '2026-10-06',
  resetsAt: RESETS.week,
}

// Exactly what `GET /agent/rate-limit` answered before it served two windows,
// and what a client newer than its server still receives.
const LEGACY_FLAT_PAYLOAD = {
  remaining: 18,
  total: 20,
  resetTime: RESETS.hour,
  currentCount: 2,
}

describe('asRateLimitWindows', () => {
  it('accepts both windows', () => {
    expect(asRateLimitWindows(limits(7))).toEqual(limits(7))
  })

  // This is the payload that took the Build screen down: the old flat shape,
  // stored as-is and then read as `rateLimit.day.remaining`.
  it('rejects the single flat window an older API returns', () => {
    expect(asRateLimitWindows(LEGACY_FLAT_PAYLOAD)).toBeNull()
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty object', {}],
    ['only the hourly window', { hour: window(5, 20, RESETS.hour) }],
    ['a window missing its reset', { hour: { remaining: 1 }, day: { remaining: 1 } }],
  ])('rejects %s', (_label, value) => {
    expect(asRateLimitWindows(value)).toBeNull()
  })
})

describe('bindingAllowance', () => {
  // A client newer than its server must degrade to "allowance unknown", not
  // crash the screen that reads it.
  it('reports no allowance for a payload it does not understand', () => {
    expect(
      bindingAllowance({
        quota: proQuota,
        rateLimit: LEGACY_FLAT_PAYLOAD as never,
      })
    ).toBeNull()
  })

  it('still reports the weekly quota against an unreadable payload', () => {
    expect(
      bindingAllowance({
        quota: freeQuota(2),
        rateLimit: LEGACY_FLAT_PAYLOAD as never,
      })
    ).toMatchObject({ remaining: 2, window: 'week' })
  })

  it('is the weekly quota on free, which is always the scarcest thing there', () => {
    expect(bindingAllowance({ quota: freeQuota(2), rateLimit: limits(10) })).toEqual({
      remaining: 2,
      window: 'week',
      resetsAt: RESETS.week,
    })
  })

  it('is the daily valve on Pro, which has no weekly quota to bind it', () => {
    expect(bindingAllowance({ quota: proQuota, rateLimit: limits(7) })).toEqual({
      remaining: 7,
      window: 'day',
      resetsAt: RESETS.day,
    })
  })

  it('is the hourly window once a burst has eaten into it', () => {
    expect(bindingAllowance({ quota: proQuota, rateLimit: limits(8, 3) })).toMatchObject({
      remaining: 3,
      window: 'hour',
    })
  })

  // Two left this week and two left this hour are not the same problem, and
  // only one of them is fixed by waiting.
  it('prefers the longer window on a tie', () => {
    expect(
      bindingAllowance({ quota: freeQuota(2), rateLimit: limits(2, 2) })
    ).toMatchObject({ window: 'week' })
    expect(bindingAllowance({ quota: proQuota, rateLimit: limits(4, 4) })).toMatchObject({
      window: 'day',
    })
  })

  it('says nothing when nothing is known yet', () => {
    expect(bindingAllowance({ quota: proQuota, rateLimit: null })).toBeNull()
    expect(bindingAllowance({ quota: undefined, rateLimit: undefined })).toBeNull()
  })

  it('still reports the weekly quota before rate limits have loaded', () => {
    expect(bindingAllowance({ quota: freeQuota(1), rateLimit: null })).toMatchObject({
      remaining: 1,
      window: 'week',
    })
  })

  it('reports zero rather than treating an exhausted allowance as unknown', () => {
    expect(bindingAllowance({ quota: proQuota, rateLimit: limits(0) })).toMatchObject({
      remaining: 0,
      window: 'day',
    })
  })
})

describe('allowanceLabel', () => {
  it.each([
    ['week', 'this week'],
    ['day', 'today'],
    ['hour', 'this hour'],
  ] as const)('renders %s as "%s"', (window, expected) => {
    expect(allowanceLabel(window)).toBe(expected)
  })
})

describe('timeUntil', () => {
  it('counts down in minutes and seconds', () => {
    expect(timeUntil(new Date(Date.now() + 90_000).toISOString())).toMatch(/^1m \d+s$/)
  })

  it('drops the minutes under one', () => {
    expect(timeUntil(new Date(Date.now() + 5_000).toISOString())).toMatch(/^\d+s$/)
  })

  it('says the window has already turned over', () => {
    expect(timeUntil(new Date(Date.now() - 1_000).toISOString())).toBe('Reset available')
  })

  it.each([undefined, 'not a date'])('has nothing to say for %s', value => {
    expect(timeUntil(value)).toBe('')
  })
})
