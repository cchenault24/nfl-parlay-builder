// src/hooks/useParlayGenerator.ts - Fixed version
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { ServiceContainer } from '../services/container'
import useParlayStore from '../store/parlayStore'
import { Game } from '../types'
import { RateLimitError } from '../types/errors'
import { LoadingPhaseUpdate } from '../types/loading'
import { responseTimeTracker } from '../utils/responseTimeTracker'
import { useRateLimit } from './useRateLimit'

export const useParlayGenerator = () => {
  const setParlay = useParlayStore(state => state.setParlay)
  const setGameData = useParlayStore(state => state.setGameData)
  const setLoadingContext = useParlayStore(state => state.setLoadingContext)
  const setToolResponses = useParlayStore(state => state.setToolResponses)
  const { updateFromResponse } = useRateLimit()

  // Retry state
  const [isRetrying, setIsRetrying] = useState(false)
  const [hasExhaustedRetries, setHasExhaustedRetries] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup effect to cancel requests on unmount
  useEffect(() => {
    return () => {
      cancelRequests()
    }
  }, [])

  // Helper function to determine if an error is retryable
  const isRetryableError = (error: Error): boolean => {
    const retryablePatterns = [
      'ai_service_unavailable',
      'service temporarily unavailable',
      'network error',
      'timeout',
      'connection failed',
      'internal server error',
      'bad gateway',
      'service unavailable',
    ]

    return retryablePatterns.some(pattern =>
      error.message.toLowerCase().includes(pattern.toLowerCase())
    )
  }

  // Cancel any ongoing requests
  const cancelRequests = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  // Reset retry state
  const resetRetryState = () => {
    setIsRetrying(false)
    setHasExhaustedRetries(false)
    cancelRequests()
  }

  // Retry function with proper cancellation and error handling
  const retryGeneration = async (
    game: Game,
    shouldUseMock: boolean,
    attemptNumber: number
  ): Promise<void> => {
    // Check if we've already exhausted retries
    if (hasExhaustedRetries) {
      return
    }

    // Check if we've reached max attempts (3 total attempts: 1 initial + 2 retries)
    if (attemptNumber > 2) {
      setIsRetrying(false)
      setHasExhaustedRetries(true)
      setParlay(null) // Clear parlay to show error state
      return
    }

    setIsRetrying(true)

    // Cancel any previous request
    cancelRequests()

    // Create new abort controller for this retry
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // Wait 2 seconds before retry
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Check if request was cancelled during wait
    if (abortController.signal.aborted) {
      return
    }

    try {
      const provider = shouldUseMock ? 'mock' : 'agent'
      const parlayService = ServiceContainer.instance.getParlayService(provider)
      const result = await parlayService.generateParlay(game)

      // Check if request was cancelled during execution
      if (abortController.signal.aborted) {
        return
      }

      // Success - reset retry state
      resetRetryState()

      // Handle success
      if (result.rateLimitInfo) {
        updateFromResponse({
          rateLimitInfo: {
            remaining: result.rateLimitInfo.remaining,
            total: result.rateLimitInfo.total || 20,
            resetTime:
              typeof result.rateLimitInfo.resetTime === 'string'
                ? new Date(result.rateLimitInfo.resetTime)
                : result.rateLimitInfo.resetTime,
            currentCount: result.rateLimitInfo.currentCount,
          },
        })
      }

      // Store the parlay data with gameData attached for UI consumption
      const parlayWithGameData = {
        ...result.parlay,
        gameData: result.gameData,
      }

      setParlay(parlayWithGameData)
    } catch (retryError) {
      // Check if request was cancelled
      if (abortController.signal.aborted) {
        return
      }

      if (isRetryableError(retryError as Error) && attemptNumber < 2) {
        // Try again
        await retryGeneration(game, shouldUseMock, attemptNumber + 1)
      } else {
        // Final failure - exhaust retries
        setIsRetrying(false)
        setHasExhaustedRetries(true)
        setParlay(null) // Clear parlay to show error state
      }
    }
  }

  const mutation = useMutation({
    mutationFn: async ({
      game,
      shouldUseMock,
    }: {
      game: Game
      shouldUseMock: boolean
    }) => {
      const startTime = Date.now()

      // Always use agent service for agentic mode, or mock if override is enabled
      const provider: 'mock' | 'agent' = shouldUseMock ? 'mock' : 'agent'
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
    onError: async (error, variables) => {
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
        resetRetryState()
        setParlay(null)
        return
      }

      if (error instanceof RateLimitError) {
        updateFromResponse({ rateLimitInfo: error.rateLimitInfo })
        resetRetryState()
        setParlay(null)
        return
      }

      // Check if error is retryable and we haven't exhausted retries
      if (
        error instanceof Error &&
        isRetryableError(error) &&
        !hasExhaustedRetries
      ) {
        await retryGeneration(variables.game, variables.shouldUseMock, 0) // Start with attempt 0 (first retry)
        return // Don't set parlay to null here, let retryGeneration handle it
      }

      // Non-retryable error or retries exhausted
      resetRetryState()
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

      // Reset retry state on success
      resetRetryState()

      if (data.rateLimitInfo) {
        updateFromResponse({
          rateLimitInfo: {
            remaining: data.rateLimitInfo.remaining,
            total: data.rateLimitInfo.total || 20,
            resetTime:
              typeof data.rateLimitInfo.resetTime === 'string'
                ? new Date(data.rateLimitInfo.resetTime)
                : data.rateLimitInfo.resetTime,
            currentCount: data.rateLimitInfo.currentCount,
          },
        })
      }

      setParlay(data.parlay)
      setGameData(data.gameData)

      setToolResponses(data.toolResponses || null)
    },
  })

  return {
    mutate: mutation.mutate, // Return 'mutate' to match App.tsx expectations
    data: mutation.data?.parlay,
    isPending: mutation.isPending || isRetrying, // Include retry state in pending
    isError: mutation.isError || hasExhaustedRetries, // Include exhausted retries as error state
    error: mutation.error,
    reset: () => {
      mutation.reset()
      resetRetryState()
    },
    isSuccess: mutation.isSuccess,
    cancelRequests, // Expose cancel function for external use
  }
}

// Also update the export to match the expected interface
export const useParlayGeneratorReal = useParlayGenerator // Keep for backwards compatibility
