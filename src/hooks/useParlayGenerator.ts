// src/hooks/useParlayGenerator.ts - Fixed version
import { useMutation } from '@tanstack/react-query'
import { ServiceContainer } from '../services/container'
import useParlayStore from '../store/parlayStore'
import { NFLGame } from '../types'
import { RateLimitError } from '../types/errors'
import { useRateLimit } from './useRateLimit'

export const useParlayGenerator = () => {
  const setParlay = useParlayStore(state => state.setParlay)
  const parlayService = ServiceContainer.instance.getParlayService()
  const { updateFromResponse } = useRateLimit()

  const mutation = useMutation({
    mutationFn: async ({
      game,
      shouldUseMock,
    }: {
      game: NFLGame
      shouldUseMock: boolean | null
    }) => {
      const provider = shouldUseMock === true ? 'mock' : 'openai'
      return await parlayService.generateParlay(game, { provider })
    },
    onError: error => {
      console.error('Error generating parlay:', error)

      if (error instanceof RateLimitError) {
        console.warn('Rate limit exceeded:', error.rateLimitInfo)
        updateFromResponse({ rateLimitInfo: error.rateLimitInfo })
      }

      setParlay(null)
    },
    onSuccess: data => {
      if (data.rateLimitInfo) {
        updateFromResponse({
          rateLimitInfo: {
            remaining: data.rateLimitInfo.remaining,
            total: data.rateLimitInfo.total || 10,
            resetTime:
              typeof data.rateLimitInfo.resetTime === 'string'
                ? new Date(data.rateLimitInfo.resetTime)
                : data.rateLimitInfo.resetTime,
            currentCount: data.rateLimitInfo.currentCount,
          },
        })
      }

      setParlay(data.parlay)
    },
  })

  return {
    mutate: mutation.mutate, // Return 'mutate' to match App.tsx expectations
    data: mutation.data?.parlay,
    isPending: mutation.isPending, // Return 'isPending' to match App.tsx expectations
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
    isSuccess: mutation.isSuccess,
  }
}

// Also update the export to match the expected interface
export const useParlayGeneratorReal = useParlayGenerator // Keep for backwards compatibility
