import { useQuery } from '@tanstack/react-query'
import { API_CONFIG } from '../config/api'

interface V2CurrentWeekResponse {
  week: number
  season: number
}

export const useCurrentWeek = () => {
  const query = useQuery({
    queryKey: ['current-nfl-week-v2'],
    queryFn: async (): Promise<number> => {
      const base = API_CONFIG.CLOUD_FUNCTIONS.baseURL
      const response = await fetch(
        `${base}${API_CONFIG.CLOUD_FUNCTIONS.endpoints.v2.currentWeek}`
      )
      const data: V2CurrentWeekResponse = await response.json()
      return data.week
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
