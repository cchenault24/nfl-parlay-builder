import type { RateLimitInfo } from '@shared/types'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuth } from '@/lib/auth/useAuth'
import { auth } from '@/lib/firebase'
import useRateLimitStore from '@/store/rateLimitStore'

import { AgentRunService } from './AgentRunService'

const service = new AgentRunService()

export const useRateLimit = () => {
  // Web uses react-firebase-hooks here; mobile already has an auth context.
  const { user, loading } = useAuth()
  const {
    rateLimitInfo,
    setRateLimitInfo,
    updateFromResponse,
    isNearLimit,
    isAtLimit,
    getTimeUntilReset,
  } = useRateLimitStore()

  const query = useQuery({
    queryKey: ['rateLimitStatus', user?.uid],
    queryFn: async (): Promise<RateLimitInfo> => {
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('Not signed in')
      }
      return service.getRateLimitStatus(token)
    },
    enabled: !!user,
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: false,
  })

  useEffect(() => {
    if (query.data) {
      setRateLimitInfo(query.data)
    }
  }, [query.data, setRateLimitInfo])

  useEffect(() => {
    if (!user && !loading) {
      setRateLimitInfo(null)
    }
  }, [user, loading, setRateLimitInfo])

  return {
    rateLimitInfo,
    isLoading: query.isLoading || loading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    updateFromResponse,
    getTimeUntilReset,
    isNearLimit,
    isAtLimit,
  }
}
