import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PersistStorage } from 'zustand/middleware'
import { createRateLimitStore } from './rateLimitStore'
import type { RateLimitWindows } from '../types'

// bindingAllowance in rateLimits.ts is well covered, but this store carries its
// own copy of the window-selection decision — and the two are different
// functions, so the tests for one say nothing about the other.

const windows = (
  day: { remaining: number; resetTime?: string },
  hour: { remaining: number; resetTime?: string }
): RateLimitWindows =>
  ({
    day: {
      limit: 10,
      total: 10,
      currentCount: 10 - day.remaining,
      remaining: day.remaining,
      resetTime: day.resetTime ?? FUTURE,
    },
    hour: {
      limit: 20,
      total: 20,
      currentCount: 20 - hour.remaining,
      remaining: hour.remaining,
      resetTime: hour.resetTime ?? FUTURE,
    },
  }) as RateLimitWindows

const FUTURE = new Date(Date.now() + 3_600_000).toISOString()

// An in-memory PersistStorage, so the persist middleware's own behaviour —
// version, migrate, partialize — can be exercised without a device.
function memoryStorage(seed?: Record<string, unknown>) {
  const values = new Map<string, unknown>(Object.entries(seed ?? {}))
  const storage: PersistStorage<{ rateLimit: RateLimitWindows | null }> = {
    getItem: name => (values.get(name) ?? null) as never,
    setItem: (name, value) => {
      values.set(name, value)
    },
    removeItem: name => {
      values.delete(name)
    },
  }
  return { storage, values }
}

const store = () => createRateLimitStore(memoryStorage().storage)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isAtLimit', () => {
  it('is false with room in both windows', () => {
    const s = store()
    s.getState().setRateLimit(windows({ remaining: 5 }, { remaining: 9 }))

    expect(s.getState().isAtLimit()).toBe(false)
  })

  it('is true the moment either window reaches zero', () => {
    const s = store()
    s.getState().setRateLimit(windows({ remaining: 0 }, { remaining: 9 }))
    expect(s.getState().isAtLimit()).toBe(true)

    s.getState().setRateLimit(windows({ remaining: 5 }, { remaining: 0 }))
    expect(s.getState().isAtLimit()).toBe(true)
  })

  it('is false at exactly one remaining', () => {
    const s = store()
    s.getState().setRateLimit(windows({ remaining: 1 }, { remaining: 1 }))

    expect(s.getState().isAtLimit()).toBe(false)
  })

  // Fail-open on an unreadable payload is the right call — this is a display
  // hint, and the server refuses the run regardless — but nothing held it there.
  it('is false when nothing has been reported yet', () => {
    expect(store().getState().isAtLimit()).toBe(false)
  })

  it('is false when the payload is a shape this build does not understand', () => {
    const s = store()
    s.getState().setRateLimit({ nonsense: true } as never)

    expect(s.getState().isAtLimit()).toBe(false)
  })
})

describe('getTimeUntilReset', () => {
  const inMinutes = (n: number) => new Date(Date.now() + n * 60_000).toISOString()

  it('reports the window with the fewest runs left', () => {
    const s = store()
    s.getState().setRateLimit(
      windows(
        { remaining: 1, resetTime: inMinutes(120) },
        { remaining: 5, resetTime: inMinutes(10) }
      )
    )

    // The day window is tighter, so its reset is the one reported — not the
    // hour's, which clears far sooner and would be the wrong thing to wait for.
    expect(s.getState().getTimeUntilReset()).toMatch(/^119m|^120m/)
  })

  // The tie-break: with both windows equal the day is reported, because waiting
  // out the hour would not help. Flipping `<=` to `<` would tell a user to wait
  // an hour when their block lasts a day.
  it('prefers the day window when the two are tied', () => {
    const s = store()
    s.getState().setRateLimit(
      windows(
        { remaining: 3, resetTime: inMinutes(600) },
        { remaining: 3, resetTime: inMinutes(5) }
      )
    )

    const reported = s.getState().getTimeUntilReset()
    expect(reported).toMatch(/^599m|^600m/)
  })

  it('returns nothing when there is no payload', () => {
    expect(store().getState().getTimeUntilReset()).toBe('')
  })
})

describe('updateFromResponse', () => {
  it('replaces what is held', () => {
    const s = store()
    s.getState().setRateLimit(windows({ remaining: 9 }, { remaining: 9 }))
    s.getState().updateFromResponse(windows({ remaining: 1 }, { remaining: 2 }))

    expect(s.getState().rateLimit?.day.remaining).toBe(1)
  })

  it('accepts being cleared', () => {
    const s = store()
    s.getState().setRateLimit(windows({ remaining: 9 }, { remaining: 9 }))
    s.getState().setRateLimit(null)

    expect(s.getState().rateLimit).toBeNull()
  })
})

describe('persistence', () => {
  it('writes only the rateLimit, not the actions', () => {
    const { storage, values } = memoryStorage()
    const s = createRateLimitStore(storage)
    s.getState().setRateLimit(windows({ remaining: 4 }, { remaining: 7 }))

    const written = values.get('nfl-parlay-rate-limit-store') as {
      state: Record<string, unknown>
    }
    expect(Object.keys(written.state)).toEqual(['rateLimit'])
  })

  // The only migration in the app, and the "data written by a previous version"
  // case. A v1 payload held one window where the code now expects two.
  it('discards a payload from an older shape rather than carrying it forward', () => {
    const { storage } = memoryStorage({
      'nfl-parlay-rate-limit-store': {
        version: 1,
        state: { rateLimit: { limit: 10, total: 10, currentCount: 7, remaining: 3, resetTime: FUTURE } },
      },
    })

    const s = createRateLimitStore(storage)

    expect(s.getState().rateLimit).toBeNull()
    expect(s.getState().isAtLimit()).toBe(false)
  })

  it('restores a payload written by the current shape', () => {
    const { storage } = memoryStorage({
      'nfl-parlay-rate-limit-store': {
        version: 2,
        state: { rateLimit: windows({ remaining: 0 }, { remaining: 4 }) },
      },
    })

    const s = createRateLimitStore(storage)

    expect(s.getState().isAtLimit()).toBe(true)
  })

  // `...(storage ? { storage } : {})` rather than `storage: storage`: persist
  // merges over its defaults, so an explicit undefined disables persistence
  // entirely instead of falling back to localStorage.
  it('still works when no storage is supplied', () => {
    const s = createRateLimitStore()
    s.getState().setRateLimit(windows({ remaining: 0 }, { remaining: 4 }))

    expect(s.getState().isAtLimit()).toBe(true)
  })
})
