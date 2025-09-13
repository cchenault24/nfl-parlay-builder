import { useQuery } from '@tanstack/react-query'
import { getNFLDataService } from '../services/container'
import { NFLGame } from '../types'

export const useNFLGames = (week?: number) => {
  const nflDataService = getNFLDataService()

  const query = useQuery({
    queryKey: ['nfl-games', week || 'current'],
    queryFn: async (): Promise<NFLGame[]> => {
      if (week) {
        return await nflDataService.getGamesByWeek(week)
      }
      return await nflDataService.getCurrentWeekGames()
    },
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
