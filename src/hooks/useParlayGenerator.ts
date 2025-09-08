import { useMutation } from '@tanstack/react-query';
import { generateParlay } from '../services/openaiService';
import { NFLGame } from '../types';

export const useParlayGenerator = () => {
  const mutation = useMutation({
    mutationFn: (game: NFLGame) => generateParlay(game),
    onError: (error) => {
      console.error('Error generating parlay:', error);
    },
  });

  return {
    mutate: mutation.mutate,
    data: mutation.data,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
};