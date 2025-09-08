import { useQuery } from '@tanstack/react-query';
import { fetchCurrentWeekGames } from '../services/nflData';

export const useNFLGames = () => {
  return useQuery({
    queryKey: ['nfl-games', 'current-week'],
    queryFn: fetchCurrentWeekGames,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};