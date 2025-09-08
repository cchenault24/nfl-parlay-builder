// For now, let's just export a placeholder
// We'll implement the real OpenAI integration later

import type { NFLGame } from '../types/nfl';
import type { GeneratedParlay } from '../types/parlay';

export const generateParlay = async (_game: NFLGame): Promise<GeneratedParlay> => {
  // This is just a placeholder - we're using mock data in the hook instead
  throw new Error('OpenAI service not implemented yet');
};