import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { AgentRunService } from '../api/AgentRunService'
import { sharedRuntime } from '../runtime'
import type { RateLimitInfo } from '../types'

const service = new AgentRunService()

export const useRateLimit = () => {
  const runtime = sharedRuntime()
  const { uid, loading } = runtime.useAuthUser()
  const {
    rateLimitInfo,
    setRateLimitInfo,
    updateFromResponse,
    isNearLimit,
    isAtLimit,
    getTimeUntilReset,
  } = runtime.useRateLimitStore()

  const query = useQuery({
    queryKey: ['rateLimitStatus', uid],
    queryFn: async (): Promise<RateLimitInfo> => {
      const token = await runtime.getIdToken()
      if (!token) {
        throw new Error('Not signed in')
      }
      return service.getRateLimitStatus(token)
    },
    enabled: !!uid,
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
    if (!uid && !loading) {
      setRateLimitInfo(null)
    }
  }, [uid, loading, setRateLimitInfo])

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
