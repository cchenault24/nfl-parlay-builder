// src/hooks/useRateLimit.ts - Fixed types
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
        throw new Error('Failed to fetch rate limit status')
      }

      const result: RateLimitResponse = await response.json()

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Invalid response')
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
    retry: 2,
  })

  // Update local state when query data changes
  useEffect(() => {
    if (data) {
      setRateLimitInfo(data)
    }
  }, [data])

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

  return {
    rateLimitInfo,
    isLoading: isLoading || loading,
    error: error?.message || null,
    refetch,
    updateFromResponse,
    isAuthenticated: !!user,
    userId: user?.uid,
  }
}
