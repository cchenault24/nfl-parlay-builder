import { useQuery } from '@tanstack/react-query'

export const useAvailableWeeks = () => {
  const query = useQuery({
    queryKey: ['available-weeks-v2'],
    queryFn: async (): Promise<number[]> => {
      // Return standard NFL season weeks (1-18 for regular season)
      // In the future, this could be fetched from a v2 API endpoint
      return Array.from({ length: 18 }, (_, i) => i + 1)
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
