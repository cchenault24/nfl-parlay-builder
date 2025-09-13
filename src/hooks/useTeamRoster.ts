import { useQuery } from '@tanstack/react-query'
import { getNFLDataService } from '../services/container'
import { NFLPlayer } from '../types'

export const useTeamRoster = (teamId?: string) => {
  const nflDataService = getNFLDataService()

  const query = useQuery({
    queryKey: ['team-roster', teamId],
    queryFn: async (): Promise<NFLPlayer[]> => {
      if (!teamId) {
        return []
      }
      return await nflDataService.getTeamRoster(teamId)
    },
    enabled: !!teamId, // Only run query if teamId is provided
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (rosters change infrequently)
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  })

  return {
    roster: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
