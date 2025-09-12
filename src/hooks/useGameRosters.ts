import { useQuery } from '@tanstack/react-query'
import { getNFLDataService } from '../services/container'
import { GameRosters, NFLGame } from '../types'

export const useGameRosters = (game?: NFLGame) => {
  const nflDataService = getNFLDataService()

  const query = useQuery({
    queryKey: ['game-rosters', game?.id],
    queryFn: async (): Promise<GameRosters> => {
      if (!game) {
        return { homeRoster: [], awayRoster: [] }
      }
      return await nflDataService.getGameRosters(game)
    },
    enabled: !!game, // Only run query if game is provided
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (rosters change infrequently)
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  })

  return {
    rosters: query.data as GameRosters | undefined,
    homeRoster: query.data?.homeRoster || [],
    awayRoster: query.data?.awayRoster || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
