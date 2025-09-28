import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useProviderContext } from '../../../contexts/ProviderContext'
import {
  createMutationOptions,
  createQueryOptions,
  QUERY_KEYS,
} from '../../../hooks/query/useQueryConfig'
import { CloudFunctionResponse, ParlayPreferences } from '../../../types'
import { useParlayStore } from '../store/parlayStore'

/**
 * Hook for parlay generation with provider abstraction
 */
export const useParlayGeneration = () => {
  const queryClient = useQueryClient()
  const {
    setParlay,
    setGenerating,
    setGenerationError,
    selectedAIProvider,
    selectedDataProvider,
  } = useParlayStore()
  const { getAIProvider, getDataProvider } = useProviderContext()

  return useMutation({
    ...createMutationOptions<CloudFunctionResponse, Error, ParlayPreferences>({
      mutationKey: ['generateParlay'],
    }),
    mutationFn: async (
      preferences: ParlayPreferences
    ): Promise<CloudFunctionResponse> => {
      console.log(
        '🚀 Starting parlay generation with preferences:',
        preferences
      )

      setGenerating(true)
      setGenerationError(null)

      try {
        // Get the selected providers or use best available
        const aiProvider = selectedAIProvider
          ? await getAIProvider(selectedAIProvider)
          : await getAIProvider()

        const dataProvider = selectedDataProvider
          ? await getDataProvider(selectedDataProvider)
          : await getDataProvider()

        // Generate parlay using the providers
        const result = await aiProvider.generateParlay(
          preferences,
          dataProvider
        )

        console.log('✅ Parlay generated successfully')
        return result
      } catch (error) {
        console.error('❌ Parlay generation failed:', error)
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        setGenerationError(errorMessage)
        throw error
      } finally {
        setGenerating(false)
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
            provider: selectedAIProvider || 'openai',
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PARLAYS.ALL })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GAMES.ALL })
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
}

/**
 * Hook for saving parlay with provider abstraction
 */
export const useSaveParlay = () => {
  const { setSaveParlaySuccess, setSaveParlayError } = useParlayStore()
  const { getDataProvider } = useProviderContext()

  return useMutation({
    ...createMutationOptions<any, Error, any>(),
    mutationFn: async (parlayData: any) => {
      const dataProvider = await getDataProvider()
      return await dataProvider.saveParlay(parlayData)
    },
    onSuccess: () => {
      setSaveParlaySuccess(true)
      setSaveParlayError(null)
    },
    onError: (error: Error) => {
      setSaveParlayError(error.message)
      setSaveParlaySuccess(false)
    },
  })
}

/**
 * Hook for fetching parlay history with provider abstraction
 */
export const useParlayHistoryQuery = () => {
  const { getDataProvider } = useProviderContext()

  return useQuery({
    ...createQueryOptions<any[]>({
      queryKey: QUERY_KEYS.PARLAYS.HISTORY,
      staleTime: 5 * 60 * 1000, // 5 minutes for history data
      gcTime: 30 * 60 * 1000, // 30 minutes cache
    }),
    queryFn: async (): Promise<any[]> => {
      const dataProvider = await getDataProvider()
      return await dataProvider.getParlayHistory()
    },
  })
}
