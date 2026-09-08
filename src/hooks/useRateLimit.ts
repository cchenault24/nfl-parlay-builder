import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../config/firebase'
import { AgentRunService } from '../services/AgentRunService'
import useRateLimitStore from '../store/rateLimitStore'
import type { RateLimitInfo } from '../types'

const service = new AgentRunService()

export const useRateLimit = () => {
  const [user, loading] = useAuthState(auth)
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
