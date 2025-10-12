// src/hooks/useParlayGenerator.ts - Fixed version
import { useMutation } from '@tanstack/react-query'
import { ServiceContainer } from '../services/container'
import useParlayStore from '../store/parlayStore'
import { Game } from '../types'
import { RateLimitError } from '../types/errors'
import { LoadingPhaseUpdate } from '../types/loading'
import { responseTimeTracker } from '../utils/responseTimeTracker'
import { useRateLimit } from './useRateLimit'

export const useParlayGenerator = () => {
  const setParlay = useParlayStore(state => state.setParlay)
  const setLoadingContext = useParlayStore(state => state.setLoadingContext)
  const { updateFromResponse } = useRateLimit()

  const mutation = useMutation({
    mutationFn: async ({
      game,
      shouldUseMock,
    }: {
      game: Game
      shouldUseMock: boolean
    }) => {
      const startTime = Date.now()
      const provider = shouldUseMock ? 'mock' : 'openai'
      const parlayService = ServiceContainer.instance.getParlayService(provider)

      // Set up loading context
      setLoadingContext({
        isActive: true,
        isMockMode: shouldUseMock,
        currentPhase: '',
        progress: 0,
        elapsedTime: 0,
        estimatedTimeRemaining: 0,
      })

      // Create loading update callback
      const onLoadingUpdate = (update: LoadingPhaseUpdate) => {
        setLoadingContext({
          currentPhase: update.phase,
          progress: update.progress,
          estimatedTimeRemaining: update.estimatedTimeRemaining || 0,
        })
      }

      const result = await parlayService.generateParlay(game, {
        onLoadingUpdate,
      })

      // Record response time for real API calls only
      if (!shouldUseMock) {
        const responseTime = Date.now() - startTime
        responseTimeTracker.recordResponseTime(responseTime)
      }

      return result
    },
    onError: error => {
      console.error('Error generating parlay:', error)

      // Reset loading context on error
      setLoadingContext({
        isActive: false,
        currentPhase: '',
        progress: 0,
        elapsedTime: 0,
        estimatedTimeRemaining: 0,
      })

      // Handle authentication errors specifically
      if (
        error instanceof Error &&
        error.message.includes('not authenticated')
      ) {
        console.error('Authentication required - user needs to log in')
        // You could trigger a re-authentication flow here if needed
      }

      if (error instanceof RateLimitError) {
        console.warn('Rate limit exceeded:', error.rateLimitInfo)
        updateFromResponse({ rateLimitInfo: error.rateLimitInfo })
      }

      setParlay(null)
    },
    onSuccess: data => {
      // Update loading context to show completion
      setLoadingContext({
        currentPhase: 'generating_parlay',
        progress: 100,
        estimatedTimeRemaining: 0,
      })

      // Small delay to show completion, then reset
      setTimeout(() => {
        setLoadingContext({
          isActive: false,
          currentPhase: '',
          progress: 0,
          elapsedTime: 0,
          estimatedTimeRemaining: 0,
        })
      }, 500)

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

      // Store the parlay data with gameData attached for UI consumption
      const parlayWithGameData = {
        ...data.parlay,
        gameData: data.gameData,
      }

      setParlay(parlayWithGameData)
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
