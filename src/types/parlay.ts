export type BetType = 'spread' | 'total' | 'moneyline' | 'player_prop';

export interface ParlayLeg {
  id: string;
  betType: BetType;
  selection: string;
  target: string;
  reasoning: string;
  confidence: number;
  odds: string;
}

export interface GeneratedParlay {
  id: string;
  legs: [ParlayLeg, ParlayLeg, ParlayLeg];
  gameContext: string;
  aiReasoning: string;
  overallConfidence: number;
  estimatedOdds: string;
  createdAt: string;
}

export interface ParlayRequest {
  gameId: string;
  legCount: 3;
}