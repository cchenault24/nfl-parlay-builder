import { useQuery } from '@tanstack/react-query';

export const useAvailableWeeks = () => {
  const query = useQuery({
    queryKey: ['available-weeks-v2'],
    queryFn: () => {
      // Return all regular season weeks (1-18)
      return Array.from({ length: 18 }, (_, i) => i + 1);
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  return {
    availableWeeks: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};