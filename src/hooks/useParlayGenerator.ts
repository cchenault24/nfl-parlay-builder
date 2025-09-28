import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParlayStore } from '../features/parlay/store/parlayStore'
import { ParlayPreferences, ParlayService } from '../services/ParlayService'
import useGeneralStore from '../store/generalStore'
import { GeneratedParlay, ParlayLeg } from '../types'
import { CloudFunctionResponse } from '../types/api/interfaces'
import { useClientRateLimit } from './useClientRateLimit'

// Create a singleton instance - will be updated based on mock toggle
const parlayService = new ParlayService('openai')

interface UseParlayGeneratorOptions {
  onSuccess?: (data: GeneratedParlay) => void
  onError?: (error: Error) => void
  provider?: string
}

export const useParlayGenerator = (options: UseParlayGeneratorOptions = {}) => {
  const queryClient = useQueryClient()
  const setParlay = useParlayStore(state => state.setParlay)
  const { canMakeRequest, incrementRateLimit, rateLimitInfo } =
    useClientRateLimit()

  // Get mock toggle state from store
  const devMockOverride = useGeneralStore(state => state.devMockOverride)

  // Determine which provider to use based on mock toggle
  const getProvider = () => {
    if (devMockOverride !== null) {
      return devMockOverride ? 'mock' : 'openai'
    }
    // Default to mock in development, openai in production
    return import.meta.env.MODE === 'development' ? 'mock' : 'openai'
  }

  // Update provider based on mock toggle state
  const currentProvider = getProvider()
  if (parlayService.getConfig().provider !== currentProvider) {
    parlayService.setProvider(currentProvider)
    if (import.meta.env.DEV) {
      // Provider switched (logged via logger)
    }
  }

  // Update provider if explicitly specified in options
  if (options.provider) {
    parlayService.setProvider(options.provider)
  }

  const mutation = useMutation({
    mutationKey: ['generateParlay'],
    mutationFn: async (preferences: ParlayPreferences) => {
      if (import.meta.env.DEV) {
        // Starting parlay generation (logged via logger)
        // Using provider (logged via logger)
      }

      // Validate that we have the minimum required data
      if (!preferences) {
        throw new Error('Preferences are required to generate a parlay')
      }

      // Check rate limit before making the request
      if (!canMakeRequest()) {
        throw new Error(
          `Rate limit exceeded. You have ${rateLimitInfo?.remaining || 0} requests remaining. Please wait until ${rateLimitInfo?.resetTime?.toLocaleTimeString()} to try again.`
        )
      }

      try {
        const result = await parlayService.generateParlay(preferences)

        // Increment rate limit after successful generation
        incrementRateLimit()

        if (import.meta.env.DEV) {
          // Parlay generated successfully (logged via logger)
        }
        return result
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('❌ Parlay generation failed:', error)
        }
        throw error
      }
    },
    onSuccess: (data: CloudFunctionResponse) => {
      // Store the parlay in the store
      if (data.success && data.data) {
        if (import.meta.env.DEV) {
          // Using actual Cloud Function response data (logged via logger)
        }

        const transformedParlay = {
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          legs: (() => {
            const legs = (data.data.legs || []).map(
              (leg: ParlayLeg, index: number) => ({
                id: leg.id || `leg-${index}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                betType: leg.betType || 'spread',
                selection: leg.selection || `Selection ${index + 1}`,
                target: leg.target || `Target ${index + 1}`,
                reasoning:
                  leg.reasoning ||
                  `AI-generated reasoning for ${leg.betType} bet`,
                confidence: leg.confidence || 7,
                odds: leg.odds?.toString() || '+100',
              })
            )

            // Ensure we have exactly 3 legs
            while (legs.length < 3) {
              legs.push({
                id: `leg-${legs.length}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                betType: 'spread',
                selection: `Selection ${legs.length + 1}`,
                target: `Target ${legs.length + 1}`,
                reasoning: 'AI-generated reasoning for spread bet',
                confidence: 7,
                odds: '+100',
              })
            }

            return legs.slice(0, 3) as [ParlayLeg, ParlayLeg, ParlayLeg]
          })(),
          gameContext: data.data.gameContext || 'Generated parlay',
          aiReasoning:
            data.data.reasoning || 'AI-generated parlay based on game analysis',
          overallConfidence: data.data.confidence || 0.75,
          estimatedOdds: data.data.totalOdds || '+100',
          gameSummary: data.data.gameSummary
            ? {
                ...data.data.gameSummary,
                gameFlow: data.data.gameSummary.gameFlow as
                  | 'balanced_tempo'
                  | 'high_scoring_shootout'
                  | 'defensive_grind'
                  | 'potential_blowout',
              }
            : {
                matchupAnalysis:
                  'Game analysis based on current team performance and historical data.',
                gameFlow: 'balanced_tempo' as const,
                keyFactors: [
                  'Team performance trends',
                  'Weather conditions',
                  'Injury reports',
                  'Head-to-head history',
                ],
                prediction:
                  'This game is expected to be competitive with balanced offensive and defensive play.',
                confidence: 7,
              },
          metadata: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            generatedAt: new Date().toISOString(),
            latency: 0,
            confidence: 0.75,
            fallbackUsed: false,
            attemptCount: 1,
          },
        }

        setParlay(transformedParlay)
      }

      // Rate limit is now handled client-side, no need to refresh

      // Invalidate related queries to refresh any cached data
      queryClient.invalidateQueries({ queryKey: ['parlays'] })
      queryClient.invalidateQueries({ queryKey: ['gameData'] })

      // Call user-provided success callback
      if (options.onSuccess) {
        options.onSuccess(data)
      }
    },
    onError: (error: Error) => {
      if (import.meta.env.DEV) {
        console.error('💥 Error generating parlay:', error.message)

        // Enhanced error logging for debugging
        if (error.message.includes('Network error')) {
          console.error(
            '🌐 Network issue detected. Check Firebase emulator status.'
          )
        } else if (error.message.includes('CORS')) {
          console.error(
            '🚫 CORS issue detected. Check Cloud Function CORS configuration.'
          )
        } else if (error.message.includes('400')) {
          console.error('📝 Bad request. Check the request payload format.')
        } else if (error.message.includes('500')) {
          console.error('🔥 Server error. Check Cloud Function logs.')
        }
      }

      // Call user-provided error callback
      if (options.onError) {
        options.onError(error)
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx) or CORS issues
      if (
        error.message.includes('400') ||
        error.message.includes('401') ||
        error.message.includes('403') ||
        error.message.includes('404') ||
        error.message.includes('CORS')
      ) {
        return false
      }

      // Retry up to 2 times for network errors and server errors
      return failureCount < 2
    },
    retryDelay: attemptIndex => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * 2 ** attemptIndex, 4000)
    },
  })

  return {
    generateParlay: mutation.mutate,
    generateParlayAsync: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,

    // Rate limiting
    canMakeRequest,
    rateLimitInfo,

    // Additional utility methods
    canRetry:
      !mutation.isPending &&
      mutation.isError &&
      !mutation.error?.message.includes('400') &&
      !mutation.error?.message.includes('CORS'),

    // Service utilities
    getServiceConfig: () => parlayService.getConfig(),
    checkServiceHealth: () => parlayService.healthCheck(),
  }
}

// Helper hook for service health monitoring
export const useServiceHealth = () => {
  return useMutation({
    mutationFn: async () => {
      return parlayService.healthCheck()
    },
    onSuccess: _isHealthy => {
      if (import.meta.env.DEV) {
        // Service health check (logged via logger)
      }
    },
    onError: error => {
      if (import.meta.env.DEV) {
        console.warn('Health check failed:', error)
      }
    },
  })
}
