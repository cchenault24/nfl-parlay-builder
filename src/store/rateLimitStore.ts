import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RateLimitInfo } from '../types'

interface RateLimitStore {
  rateLimitInfo: RateLimitInfo | null
  setRateLimitInfo: (info: RateLimitInfo | null) => void
  updateFromResponse: (info: RateLimitInfo) => void
  isNearLimit: () => boolean
  isAtLimit: () => boolean
  getTimeUntilReset: () => string
}

const useRateLimitStore = create<RateLimitStore>()(
  persist(
    (set, get) => ({
      rateLimitInfo: null,
      setRateLimitInfo: rateLimitInfo => set({ rateLimitInfo }),
      updateFromResponse: rateLimitInfo => set({ rateLimitInfo }),

      isNearLimit: () => {
        const { rateLimitInfo } = get()
        return !!rateLimitInfo && rateLimitInfo.remaining / rateLimitInfo.total < 0.2
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
    }
  )
)

export default useRateLimitStore
