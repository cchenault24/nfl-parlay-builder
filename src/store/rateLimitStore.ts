import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RateLimitInfo {
  remaining: number
  total: number
  resetTime: Date
  currentCount: number
}

interface RateLimitStore {
  // State
  rateLimitInfo: RateLimitInfo | null
  lastUpdated: number | null

  // Actions
  setRateLimitInfo: (info: RateLimitInfo | null) => void
  updateFromResponse: (responseData: {
    rateLimitInfo: {
      remaining: number
      total: number
      resetTime: Date | string
      currentCount: number
    }
  }) => void
  clearRateLimitInfo: () => void
  clearPersistedData: () => void
  isNearLimit: () => boolean
  isAtLimit: () => boolean
  getTimeUntilReset: () => string
}

const useRateLimitStore = create<RateLimitStore>()(
  persist(
    (set, get) => ({
      // Initial state
      rateLimitInfo: null,
      lastUpdated: null,

      // Action implementations
      setRateLimitInfo: info => {
        set({
          rateLimitInfo: info,
          lastUpdated: info ? Date.now() : null,
        })
      },

      updateFromResponse: responseData => {
        if (responseData.rateLimitInfo) {
          const resetTime =
            typeof responseData.rateLimitInfo.resetTime === 'string'
              ? new Date(responseData.rateLimitInfo.resetTime)
              : responseData.rateLimitInfo.resetTime

          const updatedInfo: RateLimitInfo = {
            remaining: responseData.rateLimitInfo.remaining,
            total: responseData.rateLimitInfo.total,
            resetTime,
            currentCount: responseData.rateLimitInfo.currentCount,
          }

          set({
            rateLimitInfo: updatedInfo,
            lastUpdated: Date.now(),
          })
        }
      },

      clearRateLimitInfo: () => {
        set({
          rateLimitInfo: null,
          lastUpdated: null,
        })
      },

      clearPersistedData: () => {
        // Clear the in-memory state
        set({
          rateLimitInfo: null,
          lastUpdated: null,
        })
        // Clear the persisted data from localStorage
        localStorage.removeItem('nfl-parlay-rate-limit-store')
      },

      isNearLimit: () => {
        const { rateLimitInfo } = get()
        if (!rateLimitInfo) {
          return false
        }
        const percentRemaining = rateLimitInfo.remaining / rateLimitInfo.total
        return percentRemaining < 0.2 // Less than 20% remaining
      },

      isAtLimit: () => {
        const { rateLimitInfo } = get()
        return rateLimitInfo?.remaining === 0
      },

      getTimeUntilReset: () => {
        const { rateLimitInfo } = get()
        if (!rateLimitInfo?.resetTime) {
          return ''
        }

        const now = new Date()
        const resetTime = new Date(rateLimitInfo.resetTime)
        const timeDiff = resetTime.getTime() - now.getTime()

        if (timeDiff <= 0) {
          return 'Reset available'
        }

        const minutes = Math.floor(timeDiff / (1000 * 60))
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

        if (minutes > 0) {
          return `${minutes}m ${seconds}s`
        }
        return `${seconds}s`
      },
    }),
    {
      name: 'nfl-parlay-rate-limit-store', // localStorage key
      partialize: state => ({
        rateLimitInfo: state.rateLimitInfo,
        lastUpdated: state.lastUpdated,
      }), // Persist rate limit data
    }
  )
)

export default useRateLimitStore
