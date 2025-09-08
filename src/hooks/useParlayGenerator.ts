import { useMutation } from '@tanstack/react-query';
import { generateParlay } from '../services/openaiService';
import type { NFLGame } from '../types/nfl';

export const useParlayGenerator = () => {
  return useMutation({
    mutationFn: generateParlay,
    onError: (error) => {
      console.error('Error generating parlay:', error);
    },
  });
};