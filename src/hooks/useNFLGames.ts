import { useQuery } from '@tanstack/react-query';
import { fetchCurrentWeekGames } from '../services/nflData';
import { NFLGame } from '../types';

export const useNFLGames = () => {
  const query = useQuery({
    queryKey: ['nfl-games', 'current-week'],
    queryFn: fetchCurrentWeekGames,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    data: query.data as NFLGame[] | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
