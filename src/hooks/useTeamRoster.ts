import { useQuery } from '@tanstack/react-query'
import { NFLPlayer } from '../types'

export const useTeamRoster = (teamId?: string) => {
  const query = useQuery({
    queryKey: ['team-roster-v2', teamId],
    queryFn: async (): Promise<NFLPlayer[]> => {
      if (!teamId) {
        return []
      }

      // TODO: Implement v2 roster endpoint when available
      // For now, return empty array as roster data is handled by the backend
      // during parlay generation
      return []
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
