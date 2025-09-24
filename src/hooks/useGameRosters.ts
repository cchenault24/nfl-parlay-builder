import { useQuery } from '@tanstack/react-query'
import { container } from '../services/container'
import type { GameRosters } from '../types'

export function useGameRosters(gameId?: string) {
  return useQuery<GameRosters>({
    queryKey: ['gameRosters', gameId],
    queryFn: () => container.nflData.gameRosters(gameId as string),
    enabled: !!gameId,
    staleTime: 10 * 60 * 1000, // 10m
  })
}
