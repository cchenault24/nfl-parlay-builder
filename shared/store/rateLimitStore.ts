import { create } from 'zustand'
import { persist, type PersistStorage } from 'zustand/middleware'
import type { RateLimitWindows } from '../types'
import { asRateLimitWindows, timeUntil } from '../rateLimits'

export interface RateLimitState {
  // Both fair-use windows on run creation, or null before the first response.
  rateLimit: RateLimitWindows | null
  setRateLimit: (windows: RateLimitWindows | null) => void
  updateFromResponse: (windows: RateLimitWindows) => void
  isAtLimit: () => boolean
  getTimeUntilReset: () => string
}

type Persisted = Pick<RateLimitState, 'rateLimit'>

// Bumped when the shape went from one window to two. There is nothing to
// migrate: this is a cache of something refetched every 30 seconds, and
// carrying a stale hourly bucket forward under a new shape would be more work
// than letting it refill.
const PERSIST_VERSION = 2

// The window that will refuse the next run first, ignoring the weekly quota —
// that one is the server's to report through /entitlements, and this store only
// knows about rate limits.
//
// Goes through `asRateLimitWindows` because what is held here can have been
// written by an older build of this app or by an older build of the API.
function tightest(value: RateLimitWindows | null) {
  const rateLimit = asRateLimitWindows(value)
  if (!rateLimit) {
    return null
  }
  return rateLimit.day.remaining <= rateLimit.hour.remaining
    ? rateLimit.day
    : rateLimit.hour
}

// A factory rather than a singleton because persistence is the one part that
// cannot be shared: zustand reads the storage when the store is created, so it
// has to be handed in by the client rather than looked up from the runtime.
// Web omits it and gets zustand's localStorage default; native passes
// AsyncStorage.
export const createRateLimitStore = (storage?: PersistStorage<Persisted>) =>
  create<RateLimitState>()(
    persist(
      (set, get) => ({
        rateLimit: null,
        setRateLimit: rateLimit => set({ rateLimit }),
        updateFromResponse: rateLimit => set({ rateLimit }),

        isAtLimit: () => tightest(get().rateLimit)?.remaining === 0,

        getTimeUntilReset: () => timeUntil(tightest(get().rateLimit)?.resetTime),
      }),
      {
        name: 'nfl-parlay-rate-limit-store',
        version: PERSIST_VERSION,
        migrate: () => ({ rateLimit: null }),
        partialize: state => ({ rateLimit: state.rateLimit }),
        // Spread, not `storage: storage` — persist merges these over its
        // defaults, so an explicit undefined would disable persistence
        // instead of falling back to localStorage.
        ...(storage ? { storage } : {}),
      }
    )
  )
