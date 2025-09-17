import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { API_CONFIG } from '../config/api'
import { auth } from '../config/firebase'

interface RateLimitInfo {
  remaining: number
  total: number
  resetTime: Date
  currentCount: number
}

interface RateLimitResponse {
  success: boolean
  data?: RateLimitInfo & { resetTime: string } // API returns string, we convert to Date
  error?: string
}

// Updated interface to make rateLimitInfo required when passed
interface ParlayGenerationResponse {
  rateLimitInfo: {
    remaining: number
    resetTime: Date | string // Allow both types since we handle conversion
    currentCount: number
    total?: number // Optional since some responses might not include it
  }
  [key: string]: unknown
}

/**
 * Hook to manage rate limit information
 * Integrates with existing Firebase Authentication
 */
export const useRateLimit = () => {
  const [user, loading] = useAuthState(auth)
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)

  // Query rate limit status
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['rateLimitStatus', user?.uid],
    queryFn: async (): Promise<RateLimitInfo> => {
      // Get auth token if user is authenticated
      const authToken = user ? await user.getIdToken() : null

      const response = await fetch(
        `${API_CONFIG.CLOUD_FUNCTIONS.baseURL}/getRateLimitStatus`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken
              ? {
                  Authorization: `Bearer ${authToken}`,
                }
              : {}),
          },
        }
      )

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: Failed to fetch rate limit status`
        )
      }

      const result: RateLimitResponse = await response.json()

      if (!result.success) {
        // If the API returned an error but included fallback data, use it
        if (result.data) {
          console.warn(
            'Rate limit API error, using fallback data:',
            result.error
          )
          return {
            remaining: result.data.remaining,
            total: result.data.total,
            currentCount: result.data.currentCount,
            resetTime: new Date(result.data.resetTime),
          }
        }
        throw new Error(result.error || 'Invalid response from rate limit API')
      }

      if (!result.data) {
        throw new Error('No data in rate limit response')
      }

      return {
        remaining: result.data.remaining,
        total: result.data.total,
        currentCount: result.data.currentCount,
        resetTime: new Date(result.data.resetTime),
      }
    },
    enabled: !loading, // Don't run query until auth state is determined
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
    retry: (failureCount, error) => {
      // Retry up to 2 times, but not for 4xx errors (client errors)
      if (failureCount >= 2) return false
      if (error?.message?.includes('HTTP 4')) return false
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
    if (!rateLimitInfo?.resetTime) return ''

    const now = new Date()
    const resetTime = new Date(rateLimitInfo.resetTime)
    const timeDiff = resetTime.getTime() - now.getTime()

    if (timeDiff <= 0) return 'Reset available'

    const minutes = Math.floor(timeDiff / (1000 * 60))
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  /**
   * Check if user is near rate limit (less than 20% remaining)
   */
  const isNearLimit = (): boolean => {
    if (!rateLimitInfo) return false
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
