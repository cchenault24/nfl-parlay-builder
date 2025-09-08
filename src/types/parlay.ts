export type BetType = 'spread' | 'total' | 'moneyline' | 'player_prop';

export interface ParlayLeg {
  id: string;
  betType: BetType;
  selection: string;
  target: string; // e.g., "Chiefs -3.5", "Over 45.5", "Mahomes Over 250.5 Pass Yds"
  reasoning: string;
  confidence: number; // 1-10 scale
}

export interface GeneratedParlay {
  id: string;
  legs: [ParlayLeg, ParlayLeg, ParlayLeg]; // Always exactly 3 legs
  gameContext: string;
  aiReasoning: string;
  overallConfidence: number;
  estimatedOdds: string; // e.g., "+650"
  createdAt: string;
}

export interface ParlayRequest {
  gameId: string;
  legCount: 3; // Always 3 for MVP
}