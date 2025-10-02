import { useQuery } from '@tanstack/react-query'
import { API_CONFIG } from '../config/api'
import { V2Game } from './useNFLGameWeekWithStats'

export const usePFRSchedule = () => {
  return useQuery({
    queryKey: ['pfr-schedule'],
    queryFn: async (): Promise<V2Game[]> => {
      const base = API_CONFIG.CLOUD_FUNCTIONS.baseURL
      const response = await fetch(
        `${base}${API_CONFIG.CLOUD_FUNCTIONS.endpoints.v2.pfrSchedule}`
      )

      if (!response.ok) {
        throw new Error(
          `Failed to fetch PFR schedule: ${response.status} ${response.statusText}`
        )
      }

      // PFR scraper returns data in V2Game format
      const games: V2Game[] = await response.json()
      return games
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  })
}
