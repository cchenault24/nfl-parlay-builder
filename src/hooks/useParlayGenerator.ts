import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ParlayPreferences, ParlayService } from '../services/ParlayService'
import useParlayStore from '../store/parlayStore'
import { CloudFunctionResponse } from '../types/api/interfaces'

// Create a singleton instance
const parlayService = new ParlayService('openai')

interface UseParlayGeneratorOptions {
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  provider?: string
}

export const useParlayGenerator = (options: UseParlayGeneratorOptions = {}) => {
  const queryClient = useQueryClient()
  const setParlay = useParlayStore(state => state.setParlay)

  // Update provider if specified
  if (options.provider) {
    parlayService.setProvider(options.provider)
  }

  const mutation = useMutation({
    mutationKey: ['generateParlay'],
    mutationFn: async (preferences: ParlayPreferences) => {
      console.log(
        '🚀 Starting parlay generation with preferences:',
        preferences
      )

      // Validate that we have the minimum required data
      if (!preferences) {
        throw new Error('Preferences are required to generate a parlay')
      }

      try {
        const result = (await parlayService.generateParlay(preferences)) as any
        console.log('✅ Parlay generated successfully')
        return result
      } catch (error) {
        console.error('❌ Parlay generation failed:', error)
        throw error
      }
    },
    onSuccess: (data: CloudFunctionResponse) => {
      // Store the parlay in the store
      if (data.success && data.data) {
        console.log('📊 Using actual Cloud Function response data:', data.data)

        const transformedParlay = {
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          legs: (() => {
            const legs = (data.data.legs || []).map(
              (leg: any, index: number) => ({
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

            return legs.slice(0, 3) as [any, any, any]
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

      // Invalidate related queries to refresh any cached data
      queryClient.invalidateQueries({ queryKey: ['parlays'] })
      queryClient.invalidateQueries({ queryKey: ['gameData'] })

      // Call user-provided success callback
      if (options.onSuccess) {
        options.onSuccess(data)
      }
    },
    onError: (error: Error) => {
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

// Hook for getting game data
export const useGameData = () => {
  return useMutation({
    mutationFn: async (gameId: string) => {
      return parlayService.getGameData(gameId)
    },
    onError: error => {
      console.error('Error fetching game data:', error)
    },
  })
}

// Hook for getting player stats
export const usePlayerStats = () => {
  return useMutation({
    mutationFn: async (playerId: string) => {
      return parlayService.getPlayerStats(playerId)
    },
    onError: error => {
      console.error('Error fetching player stats:', error)
    },
  })
}

// Helper hook for service health monitoring
export const useServiceHealth = () => {
  return useMutation({
    mutationFn: async () => {
      return parlayService.healthCheck()
    },
    onSuccess: isHealthy => {
      console.log(
        'Service health check:',
        isHealthy ? '✅ Healthy' : '❌ Unhealthy'
      )
    },
    onError: error => {
      console.warn('Health check failed:', error)
    },
  })
}
