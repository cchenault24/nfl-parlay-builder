import { useMutation } from '@tanstack/react-query'
import useParlayStore from '../store/parlayStore'
import { GeneratedParlay, NFLGame } from '../types'

interface UseMockParlayGeneratorReturn {
  mutate: (game: NFLGame) => void
  data: GeneratedParlay | null
  isPending: boolean
  isError: boolean
  error: Error | null
  reset: () => void
  isSuccess: boolean
}

export const useMockParlayGenerator = (): UseMockParlayGeneratorReturn => {
  const setParlay = useParlayStore(state => state.setParlay)

  // Generate mock parlay data directly (no OpenAI service needed)
  const generateMockParlay = async (
    game: NFLGame
  ): Promise<GeneratedParlay> => {
    // Simulate API delay
    await new Promise(resolve =>
      setTimeout(resolve, 1500 + Math.random() * 1000)
    )

    // Random chance of error for testing
    if (Math.random() < 0.05) {
      throw new Error('🎭 MOCK ERROR: Simulated API error for testing!')
    }

    const mockParlay: GeneratedParlay = {
      id: `mock-parlay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      legs: [
        {
          id: 'mock-leg-1',
          betType: 'spread',
          selection: `${game.homeTeam.displayName} -3.5`,
          target: '-3.5',
          reasoning:
            '🎭 MOCK: Home team has strong recent form and home field advantage.',
          confidence: Math.floor(Math.random() * 3) + 7, // 7-9
          odds: '-110',
        },
        {
          id: 'mock-leg-2',
          betType: 'total',
          selection: 'Over 47.5',
          target: '47.5',
          reasoning:
            '🎭 MOCK: Both teams have high-powered offenses and weak defenses.',
          confidence: Math.floor(Math.random() * 3) + 6, // 6-8
          odds: '-105',
        },
        {
          id: 'mock-leg-3',
          betType: 'player_prop',
          selection: `${game.homeTeam.displayName} QB Over 250.5 passing yards`,
          target: '250.5',
          reasoning:
            '🎭 MOCK: QB has been throwing for 300+ yards consistently.',
          confidence: Math.floor(Math.random() * 3) + 8, // 8-10
          odds: '+120',
        },
      ],
      gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - Week ${game.week}`,
      aiReasoning:
        '🎭 MOCK PARLAY: This is simulated data for development purposes. Strategic combination focusing on home team advantage and offensive firepower.',
      overallConfidence: Math.floor(Math.random() * 3) + 7, // 7-9
      estimatedOdds: '+280',
      createdAt: new Date().toISOString(),
      gameSummary: {
        matchupAnalysis: `🎭 MOCK: ${game.awayTeam.displayName} vs ${game.homeTeam.displayName} - Both teams coming off strong performances.`,
        gameFlow: 'high_scoring_shootout',
        keyFactors: [
          '🎭 Home field advantage',
          '🎭 Weather conditions favorable',
          '🎭 Key player matchups',
          '🎭 Recent team form',
          '🎭 Historical head-to-head',
        ],
        prediction: `🎭 MOCK: Expecting a competitive high-scoring game with ${game.homeTeam.displayName} slight edge.`,
        confidence: Math.floor(Math.random() * 3) + 7,
      },
    }

    return mockParlay
  }

  const mutation = useMutation({
    mutationFn: async (game: NFLGame): Promise<GeneratedParlay> => {
      console.log(
        '🎭 Generating mock parlay for:',
        game.awayTeam.displayName,
        '@',
        game.homeTeam.displayName
      )
      return await generateMockParlay(game)
    },
    onError: error => {
      console.error('🎭 Mock parlay generation error:', error)
      setParlay(null)
    },
    onSuccess: (data: GeneratedParlay) => {
      console.log('🎭 Mock parlay generated successfully:', data.id)
      setParlay(data)
    },
  })

  const resetWithStore = () => {
    mutation.reset()
    setParlay(null)
  }

  return {
    mutate: mutation.mutate,
    data: mutation.data || null, // ✅ Fix: Convert undefined to null
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: resetWithStore,
    isSuccess: mutation.isSuccess,
  }
}
