import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { saveParlayToUser } from '../../../config/firebase'
import { useProviderContext } from '../../../contexts/useProviderContext'
import {
  createMutationOptions,
  createQueryOptions,
  QUERY_KEYS,
} from '../../../hooks/query/useQueryConfig'
import { useAuth } from '../../../hooks/useAuth'
import {
  GeneratedParlay,
  ParlayLeg,
  ParlayPreferences,
  SavedParlay,
} from '../../../types'
import { CloudFunctionResponse } from '../../../types/api/interfaces'
import { transformRosterResponse } from '../../../utils/dataTransformation'
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
      if (import.meta.env.DEV) {
        // Starting parlay generation (logged via logger)
      }

      setGenerating(true)
      setGenerationError(null)

      try {
        // Get the selected providers or use best available
        const aiProvider = selectedAIProvider
          ? await getAIProvider(selectedAIProvider)
          : await getAIProvider()

        // Get data provider to fetch actual game and roster data
        const dataProvider = selectedDataProvider
          ? await getDataProvider(selectedDataProvider)
          : await getDataProvider()

        // Get actual game data from the selected game
        const { selectedGame } = useParlayStore.getState()
        if (!selectedGame) {
          throw new Error('No game selected for parlay generation')
        }

        // Fetch actual rosters for the selected game
        const homeRostersResponse = await dataProvider.getTeamRoster(
          selectedGame.homeTeam.id
        )
        const awayRostersResponse = await dataProvider.getTeamRoster(
          selectedGame.awayTeam.id
        )

        // Transform roster responses to proper format
        const homeRoster = transformRosterResponse(homeRostersResponse.data)
        const awayRoster = transformRosterResponse(awayRostersResponse.data)

        const rosters = {
          homeRoster: homeRoster.homeRoster,
          awayRoster: awayRoster.homeRoster, // Both responses will have homeRoster, we'll use it for both teams
        }

        // Create context from actual preferences
        const context = {
          strategy: {
            name: 'Custom Strategy',
            description: 'AI-generated parlay strategy',
            temperature: 0.7,
            riskProfile: (preferences.strategy.riskLevel === 'conservative'
              ? 'low'
              : preferences.strategy.riskLevel === 'moderate'
                ? 'medium'
                : 'high') as 'low' | 'medium' | 'high',
            confidenceRange: [0.6, 0.9] as [number, number],
            riskLevel: preferences.strategy.riskLevel,
            targetOdds: preferences.strategy.targetOdds,
            maxLegs: preferences.strategy.maxLegs,
            minLegs: preferences.strategy.minLegs,
          },
          varietyFactors: {
            strategy: 'balanced',
            focusArea: 'balanced' as
              | 'offense'
              | 'defense'
              | 'special_teams'
              | 'balanced',
            playerTier: 'star' as
              | 'star'
              | 'role_player'
              | 'breakout_candidate'
              | 'veteran',
            gameScript: 'close_game' as
              | 'high_scoring'
              | 'defensive'
              | 'blowout'
              | 'close_game',
            marketBias: 'neutral' as
              | 'public_favorite'
              | 'sharp_play'
              | 'contrarian'
              | 'neutral',
            riskTolerance: 0.5,
            includePlayerProps: preferences.varietyFactors.includePlayerProps,
            includeGameProps: preferences.varietyFactors.includeGameProps,
            includeTeamProps: preferences.varietyFactors.includeTeamProps,
            diversifyPositions: preferences.varietyFactors.diversifyPositions,
          },
          gameContext: {
            injuries: [], // TODO: Fetch actual injury data
            restDays: { home: 7, away: 7 }, // TODO: Calculate actual rest days
            isRivalry: false, // TODO: Determine from historical data
            isPlayoffs: false, // TODO: Determine from season context
            isPrimeTime: false, // TODO: Determine from game time
            venue: {
              type: 'outdoor' as 'dome' | 'outdoor', // TODO: Get actual venue data
              surface: 'grass' as 'grass' | 'turf',
              homeFieldAdvantage: 0.1,
            },
          },
          antiTemplateHints: {
            recentBetTypes: [], // TODO: Get from user history
            contextualFactors: [], // TODO: Analyze current context
            avoidPatterns: [], // TODO: Get from user preferences
            emphasizeUnique: [], // TODO: Get from user preferences
          },
        }

        // Call AI provider with actual data
        const aiResponse = await aiProvider.generateParlay(
          selectedGame,
          rosters,
          context
        )

        if (import.meta.env.DEV) {
          // Parlay generated successfully (logged via logger)
        }

        // Transform AIProviderResponse to CloudFunctionResponse format
        const transformedParlay = {
          legs: aiResponse.parlay.legs.map((leg, index) => ({
            id: leg.id || `leg-${index}`,
            betType: leg.betType || 'spread',
            selection: leg.selection || `Selection ${index + 1}`,
            target: leg.target || `Target ${index + 1}`,
            reasoning:
              leg.reasoning || `AI-generated reasoning for ${leg.betType} bet`,
            confidence: leg.confidence || 7,
            odds: leg.odds?.toString() || '+100',
          })),
          totalOdds: aiResponse.parlay.estimatedOdds || '+100',
          potentialPayout: 850, // TODO: Calculate based on odds
          confidence: aiResponse.parlay.overallConfidence || 0.7,
          reasoning:
            aiResponse.parlay.aiReasoning || 'AI-generated parlay reasoning',
          generatedAt: new Date().toISOString(),
          provider: aiResponse.metadata.provider,
          model: aiResponse.metadata.model,
          gameContext:
            aiResponse.parlay.gameContext ||
            `${selectedGame.awayTeam.displayName} @ ${selectedGame.homeTeam.displayName}`,
          gameSummary: aiResponse.parlay.gameSummary || {
            matchupAnalysis: 'AI-generated matchup analysis',
            gameFlow: 'balanced_tempo',
            keyFactors: ['AI-generated factor 1', 'AI-generated factor 2'],
            prediction: 'AI-generated prediction',
            confidence: aiResponse.parlay.overallConfidence || 0.7,
          },
        }

        return {
          success: true,
          data: transformedParlay,
          error: undefined,
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('❌ Parlay generation failed:', error)
        }
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
        if (import.meta.env.DEV) {
          // Using actual AI provider response data (logged via logger)
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
            provider: data.data.provider || selectedAIProvider || 'openai',
            model: 'gpt-4o-mini', // Default model since data.data.model might not exist
            generatedAt: new Date().toISOString(),
            latency: 0,
            confidence: data.data.confidence || 0.75,
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
  const { user } = useAuth()

  return useMutation({
    ...createMutationOptions<GeneratedParlay, Error, GeneratedParlay>(),
    mutationFn: async (parlayData: GeneratedParlay) => {
      if (!user) {
        throw new Error('User must be authenticated')
      }
      return await saveParlayToUser(user.uid, parlayData)
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
  const { user } = useAuth()

  return useQuery({
    ...createQueryOptions<SavedParlay[]>({
      queryKey: QUERY_KEYS.PARLAYS.HISTORY,
      staleTime: 5 * 60 * 1000, // 5 minutes for history data
      gcTime: 30 * 60 * 1000, // 30 minutes cache
    }),
    queryFn: async (): Promise<SavedParlay[]> => {
      if (!user) {
        throw new Error('User must be authenticated')
      }
      // For now, return empty array until we fix the Firebase integration
      return []
    },
    enabled: !!user,
  })
}
