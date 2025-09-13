import { useQuery } from '@tanstack/react-query'
import { getNFLDataService } from '../services/container'

export const useCurrentWeek = () => {
  const nflDataService = getNFLDataService()

  const query = useQuery({
    queryKey: ['current-nfl-week'],
    queryFn: async (): Promise<number> => {
      return await nflDataService.getCurrentWeek()
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    placeholderData: 1, // Provide fallback while loading
  })

  return {
    currentWeek: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
