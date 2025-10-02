import { Timestamp } from 'firebase/firestore'

// ===== BET TYPES =====
export type BetType =
  | 'spread'
  | 'moneyline'
  | 'total'
  | 'team_total_points'
  | 'team_total_points_over'
  | 'team_total_points_under'
  | 'first_half_spread'
  | 'first_half_total'
  | 'second_half_spread'
  | 'second_half_total'
  | 'first_quarter_spread'
  | 'first_quarter_total'
  | 'player_passing_yards'
  | 'player_passing_attempts'
  | 'player_passing_completions'
  | 'player_passing_tds'
  | 'player_interceptions'
  | 'player_longest_completion'
  | 'player_rushing_yards'
  | 'player_rushing_attempts'
  | 'player_rushing_tds'
  | 'player_longest_rush'
  | 'player_receiving_yards'
  | 'player_receptions'
  | 'player_receiving_tds'
  | 'player_longest_reception'
  | 'player_rush_rec_yards'
  | 'player_pass_rush_yards'
  | 'player_pass_rec_yards'
  | 'player_pass_rush_rec_yards'
  | 'player_anytime_td'
  | 'player_first_td'
  | 'player_last_td'
  | 'team_total_tds'
  | 'field_goals_made'
  | 'field_goals_attempted'
  | 'longest_field_goal'
  | 'kicking_points'
  | 'extra_points_made'
  | 'defensive_sacks'
  | 'defensive_tackles'
  | 'defensive_interceptions'
  | 'defensive_forced_fumbles'
  | 'defensive_touchdowns'
  | 'special_teams_touchdowns'
  | 'defensive_turnovers'
  | 'alt_spread'
  | 'alt_total'
  | 'player_alt_rushing_yards'
  | 'player_alt_receiving_yards'
  | 'player_alt_passing_yards'

// ===== NFL TYPES =====
export interface NFLTeam {
  id: string
  name: string
  displayName: string
  abbreviation: string
  color: string
  alternateColor: string
  logo: string
}

export interface NFLGame {
  id: string
  date: string
  homeTeam: NFLTeam
  awayTeam: NFLTeam
  week: number
  season: number
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
}

export interface NFLPlayer {
  id: string
  name: string
  displayName: string
  position: string
  jerseyNumber: string
  experience: number
  college?: string
}

// ===== PARLAY TYPES =====
export interface ParlayLeg {
  betType: BetType
  selection: string
  odds: number
  confidence: number
  reasoning: string
}

export interface ParlayGenerationResult {
  parlay: GeneratedParlay
  rateLimitInfo?: {
    remaining: number
    total: number
    resetTime: string
    currentCount: number
  }
}

export interface GameSummary {
  matchupSummary: string
  keyFactors: string[]
  gamePrediction: {
    winner: string
    projectedScore: { home: number; away: number }
    winProbability: number
  }
}

export interface GeneratedParlay {
  parlayId: string
  gameId: string
  gameContext: string
  legs: ParlayLeg[]
  combinedOdds: number
  parlayConfidence: number
  gameSummary: GameSummary
  rosterDataUsed: {
    home: { playerId: string; name: string; position?: string }[]
    away: { playerId: string; name: string; position?: string }[]
  }
}

export interface GenerateParlayRequest {
  gameId: string
  numLegs: 3
  week: number
  riskLevel?: 'conservative' | 'moderate' | 'aggressive'
  betTypes?: 'all' | string[]
}

// ===== AUTH TYPES =====
export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  createdAt: Timestamp
  savedParlays?: string[] // Array of parlay IDs
}
