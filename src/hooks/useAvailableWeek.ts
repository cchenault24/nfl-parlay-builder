import { useQuery } from '@tanstack/react-query'
import { getNFLDataService } from '../services/container'

export const useAvailableWeeks = () => {
  const nflDataService = getNFLDataService()

  const query = useQuery({
    queryKey: ['available-weeks-v2'],
    queryFn: async (): Promise<number[]> => {
      return await nflDataService.getAvailableWeeks()
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  })

  return {
    availableWeeks: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
