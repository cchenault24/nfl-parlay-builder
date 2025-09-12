import { useQuery } from '@tanstack/react-query'
import { fetchTeamRoster } from '../services/nflData'
import { NFLPlayer } from '../types'

export const useTeamRoster = (teamId?: string) => {
  const query = useQuery({
    queryKey: ['team-roster', teamId],
    queryFn: () => (teamId ? fetchTeamRoster(teamId) : Promise.resolve([])),
    enabled: !!teamId, // Only run query if teamId is provided
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (rosters change infrequently)
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  })

  return {
    roster: query.data as NFLPlayer[] | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
