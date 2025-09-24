import { useQuery } from '@tanstack/react-query'
import { container } from '../services/container'
import type { NFLGame } from '../types'

export function useNFLGames(week?: number) {
  return useQuery<NFLGame[]>({
    queryKey: ['nflGames', week ?? 'current'],
    queryFn: () => container.nflData.nflGames(week),
    staleTime: 5 * 60 * 1000, // 5m
  })
}
