import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../config/firebase'

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
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)

  // Query rate limit status - DISABLED for v2 (no rate limit endpoint yet)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['rateLimitStatus', user?.uid],
    queryFn: async (): Promise<RateLimitInfo> => {
      // V2 doesn't have rate limit status endpoint yet, return default values
      return {
        remaining: 10,
        total: 10,
        currentCount: 0,
        resetTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      }
    },
    enabled: false, // Disabled until v2 rate limit endpoint is added
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

  // Update local state when query data changes
  useEffect(() => {
    if (data) {
      setRateLimitInfo(data)
    }
  }, [data])

  /**
   * Update rate limit info from a parlay generation response
   * This allows real-time updates when rate limits change
   */
  const updateFromResponse = (responseData: ParlayGenerationResponse) => {
    if (responseData.rateLimitInfo) {
      const resetTime =
        typeof responseData.rateLimitInfo.resetTime === 'string'
          ? new Date(responseData.rateLimitInfo.resetTime)
          : responseData.rateLimitInfo.resetTime

      const updatedInfo: RateLimitInfo = {
        remaining: responseData.rateLimitInfo.remaining,
        total: responseData.rateLimitInfo.total || rateLimitInfo?.total || 10, // Use existing total or default
        resetTime,
        currentCount: responseData.rateLimitInfo.currentCount,
      }

      setRateLimitInfo(updatedInfo)
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
  }

  /**
   * Check if user is near rate limit (less than 20% remaining)
   */
  const isNearLimit = (): boolean => {
    if (!rateLimitInfo) {
      return false
    }
    const percentRemaining = rateLimitInfo.remaining / rateLimitInfo.total
    return percentRemaining < 0.2
  }

  /**
   * Check if user has hit rate limit
   */
  const isAtLimit = (): boolean => {
    return rateLimitInfo?.remaining === 0
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
