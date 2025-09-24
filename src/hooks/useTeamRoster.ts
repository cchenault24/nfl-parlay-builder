import { useQuery } from '@tanstack/react-query'
import { container } from '../services/container'
import type { NFLPlayer } from '../types'

export const useTeamRoster = (teamId?: string) => {
  const query = useQuery({
    queryKey: ['team-roster', teamId],
    queryFn: async (): Promise<NFLPlayer[]> => {
      if (!teamId) return []
      return container.nflData.teamRoster(teamId)
    },
    enabled: !!teamId,
    staleTime: 24 * 60 * 60 * 1000, // 24h
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7d
  })

  return { roster: query.data ?? [], ...query }
}
