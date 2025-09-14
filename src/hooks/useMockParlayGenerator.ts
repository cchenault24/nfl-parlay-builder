import { useMutation, useQueryClient } from '@tanstack/react-query'
import { mockOpenAIService } from '../services/mockOpenaiService'
import useParlayStore from '../store/parlayStore'
import { GeneratedParlay, NFLGame, NFLPlayer } from '../types'

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
  const queryClient = useQueryClient()
  const setParlay = useParlayStore(state => state.setParlay)

  // Generate mock rosters for testing
  const generateMockRosters = (
    game: NFLGame
  ): { homeRoster: NFLPlayer[]; awayRoster: NFLPlayer[] } => {
    const createMockPlayer = (
      name: string,
      position: string,
      teamId: string
    ): NFLPlayer => ({
      id: `${teamId}-${name.replace(/\s+/g, '-').toLowerCase()}`,
      name,
      displayName: name,
      position,
      jerseyNumber: Math.floor(Math.random() * 99 + 1).toString(),
      experience: Math.floor(Math.random() * 10 + 1),
    })

    const homeRoster: NFLPlayer[] = [
      createMockPlayer(
        `${game.homeTeam.displayName} QB`,
        'QB',
        game.homeTeam.id
      ),
      createMockPlayer(
        `${game.homeTeam.displayName} RB1`,
        'RB',
        game.homeTeam.id
      ),
      createMockPlayer(
        `${game.homeTeam.displayName} RB2`,
        'RB',
        game.homeTeam.id
      ),
      createMockPlayer(
        `${game.homeTeam.displayName} WR1`,
        'WR',
        game.homeTeam.id
      ),
      createMockPlayer(
        `${game.homeTeam.displayName} WR2`,
        'WR',
        game.homeTeam.id
      ),
      createMockPlayer(
        `${game.homeTeam.displayName} WR3`,
        'WR',
        game.homeTeam.id
      ),
      createMockPlayer(
        `${game.homeTeam.displayName} TE`,
        'TE',
        game.homeTeam.id
      ),
    ]

    const awayRoster: NFLPlayer[] = [
      createMockPlayer(
        `${game.awayTeam.displayName} QB`,
        'QB',
        game.awayTeam.id
      ),
      createMockPlayer(
        `${game.awayTeam.displayName} RB1`,
        'RB',
        game.awayTeam.id
      ),
      createMockPlayer(
        `${game.awayTeam.displayName} RB2`,
        'RB',
        game.awayTeam.id
      ),
      createMockPlayer(
        `${game.awayTeam.displayName} WR1`,
        'WR',
        game.awayTeam.id
      ),
      createMockPlayer(
        `${game.awayTeam.displayName} WR2`,
        'WR',
        game.awayTeam.id
      ),
      createMockPlayer(
        `${game.awayTeam.displayName} WR3`,
        'WR',
        game.awayTeam.id
      ),
      createMockPlayer(
        `${game.awayTeam.displayName} TE`,
        'TE',
        game.awayTeam.id
      ),
    ]

    return { homeRoster, awayRoster }
  }

  const mutation = useMutation({
    mutationFn: async (game: NFLGame): Promise<GeneratedParlay> => {
      console.log('🎭 Using Mock Parlay Generator')
      console.log(
        '🎯 Generating parlay for:',
        game.awayTeam.displayName,
        '@',
        game.homeTeam.displayName
      )

      const { homeRoster, awayRoster } = generateMockRosters(game)

      console.log('📋 Generated mock rosters:', {
        home: homeRoster.length,
        away: awayRoster.length,
        homeTeam: game.homeTeam.displayName,
        awayTeam: game.awayTeam.displayName,
      })

      return await mockOpenAIService.generateParlay(game)
    },
    onError: (error: Error) => {
      console.error('💥 Mock parlay generation failed:', error)
      setParlay(null)
    },
    onSuccess: (data: GeneratedParlay) => {
      console.log('✅ Mock parlay generated successfully:', data.id)
      setParlay(data)

      // Cache the result
      const gameKey = `mock-parlay-${data.gameContext}-${data.createdAt}`
      queryClient.setQueryData(['parlay', gameKey], data)
    },
  })

  // Custom reset that also clears store
  const resetWithStore = () => {
    mutation.reset()
    setParlay(null)
    console.log('🔄 Mock parlay generator reset')
  }

  return {
    mutate: mutation.mutate,
    data: mutation.data || null,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: resetWithStore,
    isSuccess: mutation.isSuccess,
  }
}
