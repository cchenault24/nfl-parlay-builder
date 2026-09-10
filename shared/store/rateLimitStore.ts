import { create } from 'zustand'
import { persist, type PersistStorage } from 'zustand/middleware'
import type { RateLimitInfo } from '../types'

export interface RateLimitState {
  rateLimitInfo: RateLimitInfo | null
  setRateLimitInfo: (info: RateLimitInfo | null) => void
  updateFromResponse: (info: RateLimitInfo) => void
  isNearLimit: () => boolean
  isAtLimit: () => boolean
  getTimeUntilReset: () => string
}

type Persisted = Pick<RateLimitState, 'rateLimitInfo'>

// A factory rather than a singleton because persistence is the one part that
// cannot be shared: zustand reads the storage when the store is created, so it
// has to be handed in by the client rather than looked up from the runtime.
// Web omits it and gets zustand's localStorage default; native passes
// AsyncStorage.
export const createRateLimitStore = (storage?: PersistStorage<Persisted>) =>
  create<RateLimitState>()(
    persist(
      (set, get) => ({
        rateLimitInfo: null,
        setRateLimitInfo: rateLimitInfo => set({ rateLimitInfo }),
        updateFromResponse: rateLimitInfo => set({ rateLimitInfo }),

        isNearLimit: () => {
          const { rateLimitInfo } = get()
          return (
            !!rateLimitInfo &&
            rateLimitInfo.remaining / rateLimitInfo.total < 0.2
          )
        },
        isAtLimit: () => get().rateLimitInfo?.remaining === 0,

        getTimeUntilReset: () => {
          const { rateLimitInfo } = get()
          if (!rateLimitInfo) {
            return ''
          }
          const diff = new Date(rateLimitInfo.resetTime).getTime() - Date.now()
          if (diff <= 0) {
            return 'Reset available'
          }
          const minutes = Math.floor(diff / 60_000)
          const seconds = Math.floor((diff % 60_000) / 1000)
          return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
        },
      }),
      {
        name: 'nfl-parlay-rate-limit-store',
        partialize: state => ({ rateLimitInfo: state.rateLimitInfo }),
        // Spread, not `storage: storage` — persist merges these over its
        // defaults, so an explicit undefined would disable persistence
        // instead of falling back to localStorage.
        ...(storage ? { storage } : {}),
      }
    )
  )
