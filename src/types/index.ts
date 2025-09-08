// src/types/index.ts - Complete types file

// ===== BET TYPES =====
export type BetType = 'spread' | 'total' | 'moneyline' | 'player_prop';

// ===== NFL TYPES =====
export interface NFLTeam {
  id: string;
  name: string;
  displayName: string;
  abbreviation: string;
  color: string;
  alternateColor: string;
  logo: string;
}

export interface NFLGame {
  id: string;
  date: string;
  homeTeam: NFLTeam;
  awayTeam: NFLTeam;
  week: number;
  season: number;
  status: string; // Flexible string to handle any ESPN API status
}

export interface NFLPlayer {
  id: string;
  name: string;
  displayName: string;
  position: string;
  jerseyNumber: string;
  experience: number;
  college?: string;
}

export interface TeamStats {
  teamId: string;
  passingYards: number;
  rushingYards: number;
  totalYards: number;
  pointsPerGame: number;
  pointsAllowed: number;
  turnovers: number;
  record: string;
}

export interface PlayerStats {
  playerId: string;
  name: string;
  position: string;
  teamId: string;
  passingYards?: number;
  rushingYards?: number;
  receivingYards?: number;
  touchdowns: number;
  receptions?: number;
}

export interface NewsItem {
  title: string;
  description: string;
  publishedDate: string;
  url: string;
  teamIds: string[];
}

export interface NFLRoster {
  teamId: string;
  players: NFLPlayer[];
}

// ===== PARLAY TYPES =====
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

// ===== ADDITIONAL HELPER TYPES =====
export interface GameRosters {
  homeRoster: NFLPlayer[];
  awayRoster: NFLPlayer[];
}

// ===== COMPONENT PROP TYPES =====
export interface GameSelectorProps {
  games: NFLGame[];
  onGameSelect: (game: NFLGame) => void;
  loading: boolean;
  selectedGame: NFLGame | null;
  onGenerateParlay: () => void;
  canGenerate: boolean;
}

export interface ParlayDisplayProps {
  parlay?: GeneratedParlay;
  loading: boolean;
}

