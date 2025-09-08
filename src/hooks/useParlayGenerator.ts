import { useMutation } from '@tanstack/react-query';
import { NFLGame } from '../types/nfl';
import type { GeneratedParlay } from '../types/parlay';

const generateMockParlay = async (game: NFLGame): Promise<GeneratedParlay> => {
  // Simulate AI processing time
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return {
    id: `parlay-${Date.now()}`,
    legs: [
      {
        id: 'leg-1',
        betType: 'spread',
        selection: game.homeTeam.displayName,
        target: `${game.homeTeam.displayName} -3.5`,
        reasoning: 'Home field advantage and strong recent performance',
        confidence: 7,
      },
      {
        id: 'leg-2',
        betType: 'total',
        selection: 'Over',
        target: 'Over 47.5 Total Points',
        reasoning: 'Both teams have high-powered offenses',
        confidence: 8,
      },
      {
        id: 'leg-3',
        betType: 'player_prop',
        selection: 'QB',
        target: 'QB Over 275.5 Passing Yards',
        reasoning: 'Expected to be a high-passing game script',
        confidence: 6,
      },
    ],
    gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`,
    aiReasoning: 'This parlay focuses on the home team advantage and offensive capabilities of both teams.',
    overallConfidence: 7,
    estimatedOdds: '+650',
    createdAt: new Date().toISOString(),
  };
};

export const useParlayGenerator = () => {
  return useMutation({
    mutationFn: generateMockParlay,
    onError: (error) => {
      console.error('Error generating parlay:', error);
    },
  });
};