import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../config/firebase'
import { FrontendRateLimiter } from '../services/FrontendRateLimiter'
import useRateLimitStore from '../store/rateLimitStore'

interface RateLimitInfo {
  remaining: number
  total: number
  resetTime: Date
  currentCount: number
}

// interface RateLimitResponse {
//   success: boolean
//   data?: RateLimitInfo & { resetTime: string } // API returns string, we convert to Date
//   error?: string
// }

// Updated interface to make rateLimitInfo required when passed
interface ParlayGenerationResponse {
  rateLimitInfo: {
    remaining: number
    resetTime: Date | string // Allow both types since we handle conversion
    currentCount: number
    total?: number // Optional since some responses might not include it
  }
  [key: string]: string | number | boolean | object | null | undefined
}

/**
 * Hook to manage rate limit information
 * Integrates with existing Firebase Authentication
 */
export const useRateLimit = () => {
  const [user, loading] = useAuthState(auth)
  const {
    rateLimitInfo,
    setRateLimitInfo,
    updateFromResponse: storeUpdateFromResponse,
    isNearLimit: storeIsNearLimit,
    isAtLimit: storeIsAtLimit,
    getTimeUntilReset: storeGetTimeUntilReset,
  } = useRateLimitStore()

  // Query rate limit status - ENABLED for v2 with unified frontend rate limiting
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['rateLimitStatus', user?.uid],
    queryFn: async (): Promise<RateLimitInfo> => {
      // Get current rate limit status from frontend rate limiter
      return FrontendRateLimiter.getCurrentStatus(user?.uid || null)
    },
    enabled: true, // Enabled - uses frontend rate limiter for both mock and real data
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
    retry: (failureCount, error) => {
      // Retry up to 2 times, but not for 4xx errors (client errors)
      if (failureCount >= 2) {
        return false
      }
      if (error?.message?.includes('HTTP 4')) {
        return false
      }
      return true
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  // Update store when query data changes
  useEffect(() => {
    if (data) {
      setRateLimitInfo(data)
    }
  }, [data, setRateLimitInfo])

  /**
   * Update rate limit info from a parlay generation response
   * This allows real-time updates when rate limits change
   */
  const updateFromResponse = (responseData: ParlayGenerationResponse) => {
    if (responseData.rateLimitInfo) {
      storeUpdateFromResponse({
        rateLimitInfo: {
          remaining: responseData.rateLimitInfo.remaining,
          total: responseData.rateLimitInfo.total || 20, // Default to 20
          resetTime: responseData.rateLimitInfo.resetTime,
          currentCount: responseData.rateLimitInfo.currentCount,
        },
      })
    }
  }

  /**
   * Force a refresh of rate limit data
   * Useful after API calls that might change the rate limit
   */
  const refreshRateLimit = () => {
    refetch()
  }

  /**
   * Get a formatted string showing time until reset
   */
  const getTimeUntilReset = (): string => {
    return storeGetTimeUntilReset()
  }

  /**
   * Check if user is near rate limit (less than 20% remaining)
   */
  const isNearLimit = (): boolean => {
    return storeIsNearLimit()
  }

  /**
   * Check if user has hit rate limit
   */
  const isAtLimit = (): boolean => {
    return storeIsAtLimit()
  }

  return {
    rateLimitInfo,
    isLoading: isLoading || loading,
    error: error?.message || null,
    refetch,
    refreshRateLimit,
    updateFromResponse,
    getTimeUntilReset,
    isNearLimit,
    isAtLimit,
    isAuthenticated: !!user,
    userId: user?.uid,
  }
}
