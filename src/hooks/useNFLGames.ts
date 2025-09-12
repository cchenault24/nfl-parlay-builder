import { useQuery } from '@tanstack/react-query'
import { fetchGamesByWeek, fetchCurrentWeekGames } from '../services/nflData'
import { NFLGame } from '../types'

export const useNFLGames = (week?: number) => {
  const query = useQuery({
    queryKey: ['nfl-games', week || 'current'],
    queryFn: () => (week ? fetchGamesByWeek(week) : fetchCurrentWeekGames()),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  return {
    data: query.data as NFLGame[] | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
