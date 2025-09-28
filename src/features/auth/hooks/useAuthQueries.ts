import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API_CONFIG } from '../../../config/api'
import {
  createMutationOptions,
  createQueryOptions,
  QUERY_KEYS,
} from '../../../hooks/query/useQueryConfig'
import { useAuthStore } from '../store/authStore'

interface RateLimitInfo {
  remaining: number
  total: number
  currentCount: number
  resetTime: Date
}

interface RateLimitResponse {
  success: boolean
  data?: RateLimitInfo
  error?: string
}

/**
 * Hook for managing rate limit queries with provider abstraction
 */
export const useRateLimitQuery = () => {
  const { user } = useAuthStore()

  return useQuery({
    ...createQueryOptions<RateLimitInfo>({
      queryKey: QUERY_KEYS.AUTH.RATE_LIMIT,
      staleTime: 30 * 1000, // 30 seconds for rate limit data
      gcTime: 5 * 60 * 1000, // 5 minutes cache
    }),
    queryFn: async (): Promise<RateLimitInfo> => {
      console.log('🔄 Fetching rate limit status from backend')

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
    enabled: !!user, // Only run if user is authenticated
  })
}

/**
 * Hook for refreshing rate limit data
 */
export const useRefreshRateLimit = () => {
  const queryClient = useQueryClient()

  return useMutation({
    ...createMutationOptions<void, Error>(),
    mutationFn: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AUTH.RATE_LIMIT,
      })
    },
  })
}
