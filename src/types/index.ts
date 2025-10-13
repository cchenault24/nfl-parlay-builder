import { Timestamp } from 'firebase/firestore'
import { LoadingPhaseUpdate } from './loading'

// Re-export loading types
export type { LoadingPhaseUpdate } from './loading'

// ===== PFR TYPES =====
// API Types
export interface TeamStatsOffense {
  totalYards: { rank: number; yardsPerGame: number }
  passingYards: { rank: number; yardsPerGame: number }
  rushingYards: { rank: number; yardsPerGame: number }
  pointsScored: { rank: number; pointsPerGame: number }
  thirdDownConversion: { rank: number; percentage: number }
  redZoneEfficiency: { rank: number; percentage: number }
}

export interface TeamStatsDefense {
  totalYardsAllowed: { rank: number; yardsPerGame: number }
  passingYardsAllowed: { rank: number; yardsPerGame: number }
  rushingYardsAllowed: { rank: number; yardsPerGame: number }
  pointsAllowed: { rank: number; pointsPerGame: number }
  turnovers: { rank: number; total: number }
  sacks: { rank: number; total: number }
}

export interface TeamStats {
  overallRank?: number | null
  offensiveRank?: number | null
  defensiveRank?: number | null
  specialTeamsRank?: number | null
  offensiveRankings: TeamStatsOffense
  defensiveRankings: TeamStatsDefense
}

export interface Team {
  teamId: string
  name: string
  abbrev: string
  record: string
  overallRecord: string
  homeRecord: string
  roadRecord: string
  stats: TeamStats | null
}

export interface Leaders {
  passing?: { name: string; stats: string; value: number }
  rushing?: { name: string; stats: string; value: number }
  receiving?: { name: string; stats: string; value: number }
}

export interface Game {
  gameId: string
  week: number
  dateTime: string
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
  home: Team
  away: Team
  venue: { name: string; city: string; state: string }
  leaders: Leaders
  weather?: {
    condition: string
    temperatureF: number
    windMph: number
  }
}

export interface PFRTeamStats {
  teamId: string
  teamName: string
  season: number
  week: number
  record: string
  overallRecord: string
  homeRecord: string
  roadRecord: string
  offense: {
    rankings: {
      totalYardsRank: number
      passingYardsRank: number
      rushingYardsRank: number
      pointsScoredRank: number
      overallRank: number
    }
    values?: {
      totalYards?: number
      passingYards?: number
      rushingYards?: number
      pointsPerGame?: number
    }
  }
  defense: {
    rankings: {
      totalYardsAllowedRank: number
      pointsAllowedRank: number
      turnoversRank: number
      overallRank: number
    }
    values?: {
      totalYardsAllowed?: number
      pointsAllowed?: number
      takeaways?: number
    }
  }
  overallOffenseRank: number
  overallDefenseRank: number
  overallTeamRank: number
  specialTeamsRank?: number
}

export interface GameData {
  gameId: string
  week: number
  dateTime: string
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
  home: {
    teamId: string
    name: string
    abbrev: string
    record: string
    overallRecord: string
    homeRecord: string
    roadRecord: string
    stats: PFRTeamStats | null
    roster: Array<{ playerId: string; name: string; position?: string }>
  }
  away: {
    teamId: string
    name: string
    abbrev: string
    record: string
    overallRecord: string
    homeRecord: string
    roadRecord: string
    stats: PFRTeamStats | null
    roster: Array<{ playerId: string; name: string; position?: string }>
  }
  venue: { name: string; city: string; state: string }
  leaders?: {
    passing?: { name: string; stats: string; value: number }
    rushing?: { name: string; stats: string; value: number }
    receiving?: { name: string; stats: string; value: number }
  }
}

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

// ===== PARLAY TYPES =====
export interface ParlayLeg {
  betType: BetType
  selection: string
  odds: number
  confidence: number
  reasoning: string
  team: string
}

export interface ToolResponses {
  weather?: {
    condition: string
    temperatureF: number
    windMph: number
  }
  odds?: {
    moneylineHome: number
    moneylineAway: number
    totalPoints: number
    spreadHome: number
  }
}

export interface GameContext {
  gameId: string
  week: number
  dateTime: string
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
  home: {
    teamId: string
    name: string
    abbrev: string
    record?: string
    overallRecord?: string
    homeRecord?: string
    roadRecord?: string
  }
  away: {
    teamId: string
    name: string
    abbrev: string
    record?: string
    overallRecord?: string
    homeRecord?: string
    roadRecord?: string
  }
  venue?: {
    name: string
    city: string
    state: string
  }
}

export interface ParlayGenerationResult {
  parlay: GeneratedParlay
  gameData: GameData
  toolResponses?: ToolResponses
  rateLimitInfo?: {
    remaining: number
    total: number
    resetTime: string
    currentCount: number
  }
  metadata?: {
    provider: string
    model: string
    tokens?: number
    latency: number
    confidence: number
    fallbackUsed: boolean
    attemptCount: number
    serviceMode?: 'mock' | 'openai' | 'agent'
    environment?: string
    runId?: string
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
}

// New response type to match backend schema
export interface GenerateParlayResponse {
  parlay: {
    parlayId: string
    gameId: string
    gameContext: string
    legs: Array<{
      betType: BetType
      selection: string
      odds: number
      confidence: number
      reasoning: string
      team: string
    }>
    combinedOdds: number
    parlayConfidence: number
    gameSummary: {
      matchupSummary: string
      keyFactors: string[]
      gamePrediction: {
        winner: string
        projectedScore: { home: number; away: number }
        winProbability: number
      }
    }
  }
  gameData: GameData
  rateLimitInfo: {
    remaining: number
    total: number
    resetTime: string // ISO string format
    currentCount: number
  }
}

export interface GenerateParlayRequest {
  gameId: string
  numLegs: 3
  week: number
  riskLevel?: 'conservative' | 'moderate' | 'aggressive'
  betTypes?: 'all' | string[]
}

// ===== PARLAY GENERATION TYPES =====
export interface StrategyConfig {
  name: string
  description: string
  temperature: number
  riskProfile: 'low' | 'medium' | 'high'
  confidenceRange: [number, number]
}

export interface VarietyFactors {
  strategy: string
  focusArea: string
  playerTier: string
  gameScript: string
  marketBias: string
}

export interface ParlayGenerationOptions {
  temperature?: number
  strategy?: StrategyConfig
  varietyFactors?: VarietyFactors
  debugMode?: boolean
  onLoadingUpdate?: (update: LoadingPhaseUpdate) => void
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
