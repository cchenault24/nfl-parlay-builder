import { useQuery } from '@tanstack/react-query'
import { fetchGameRosters } from '../services/nflData'
import { NFLGame, GameRosters } from '../types'

export const useGameRosters = (game?: NFLGame) => {
  const query = useQuery({
    queryKey: ['game-rosters', game?.id],
    queryFn: () =>
      game
        ? fetchGameRosters(game)
        : Promise.resolve({ homeRoster: [], awayRoster: [] }),
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
