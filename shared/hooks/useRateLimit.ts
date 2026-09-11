import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { AgentRunService } from '../api/AgentRunService'
import { sharedRuntime } from '../runtime'
import type { RateLimitWindows } from '../types'

const service = new AgentRunService()

export const useRateLimit = () => {
  const runtime = sharedRuntime()
  const { uid, loading } = runtime.useAuthUser()
  const {
    rateLimit,
    setRateLimit,
    updateFromResponse,
    isAtLimit,
    getTimeUntilReset,
  } = runtime.useRateLimitStore()

  const query = useQuery({
    queryKey: ['rateLimitStatus', uid],
    queryFn: async (): Promise<RateLimitWindows> => {
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
      setRateLimit(query.data)
    }
  }, [query.data, setRateLimit])

  useEffect(() => {
    if (!uid && !loading) {
      setRateLimit(null)
    }
  }, [uid, loading, setRateLimit])

  return {
    rateLimit,
    isLoading: query.isLoading || loading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    updateFromResponse,
    getTimeUntilReset,
    isAtLimit,
  }
}
