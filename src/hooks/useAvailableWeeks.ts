import { useQuery } from '@tanstack/react-query'
import { container } from '../services/container'

export function useAvailableWeeks() {
  return useQuery({
    queryKey: ['availableWeek'],
    queryFn: () => container.nflData.availableWeek(),
    staleTime: 60 * 60 * 1000, // 1h
  })
}
