/**
 * Shared types for Firebase Functions
 * These mirror the types from your client-side application
 */

import { AIProvider } from './service/ai/ParlayAIService'

// === NFL Game Types ===
export interface NFLTeam {
  id: string
  abbreviation: string
  displayName: string
  shortDisplayName: string
  color: string
  alternateColor: string
  logo: string
}

export interface NFLGame {
  id: string
  week: number
  seasonType: number
  homeTeam: NFLTeam
  awayTeam: NFLTeam
  date: string
  status: {
    type: {
      id: string
      name: string
      state: string
      completed: boolean
    }
  }
}

// === Player Types ===
export interface NFLPlayer {
  id: string
  fullName: string
  displayName: string
  shortName: string
  position: {
    abbreviation: string
    displayName: string
  }
  jersey: string
  experience: {
    years: number
  }
  age: number
  status: {
    type: string
  }
}

// === Parlay Types ===
export type BetType =
  | 'spread'
  | 'total'
  | 'moneyline'
  | 'player_prop'
  | 'player_passing'
  | 'player_rushing'
  | 'player_receiving'
  | 'team_total'
  | 'first_touchdown'
  | 'defensive_props'

export interface ParlayLeg {
  id: string
  betType: BetType
  selection: string
  target: string
  reasoning: string
  confidence: number
  odds: string
}

export interface GameSummary {
  matchupAnalysis: string
  gameFlow:
    | 'high_scoring_shootout'
    | 'defensive_grind'
    | 'balanced_tempo'
    | 'potential_blowout'
  keyFactors: string[]
  prediction: string
  confidence: number
}

export interface GeneratedParlay {
  id: string
  legs: ParlayLeg[]
  gameContext: string
  aiReasoning: string
  overallConfidence: number
  estimatedOdds: string
  createdAt: string
  gameSummary: GameSummary
  metadata?: {
    provider: string
    model: string
    generatedAt: string
    varietyScore?: number
    templateRisk?: 'low' | 'medium' | 'high'
  }
}

export interface GameRosters {
  homeRoster: NFLPlayer[]
  awayRoster: NFLPlayer[]
}

// === Enhanced variety factors for sophisticated parlay generation ===
export interface VarietyFactors {
  strategy: string
  focusArea: 'offense' | 'defense' | 'special_teams' | 'balanced'
  gameScript: 'high_scoring' | 'defensive' | 'blowout' | 'close_game'
  focusPlayer?: NFLPlayer | null
  riskTolerance: number // 0.0 to 1.0

  // Enhanced factors
  playerTier?: 'star' | 'role_player' | 'breakout_candidate' | 'veteran'
  marketBias?: 'public_favorite' | 'sharp_play' | 'contrarian' | 'neutral'
  timeContext?: 'early_season' | 'mid_season' | 'late_season' | 'playoffs'
  motivationalFactors?: string[]
}

// === Enhanced strategy configuration ===
export interface StrategyConfig {
  name: string
  description: string
  temperature: number
  focusAreas: string[]
  riskLevel: 'conservative' | 'moderate' | 'aggressive'

  // Enhanced properties
  betTypeWeights?: Record<string, number>
  contextFactors?: string[]
  confidenceRange?: [number, number]
  preferredGameScripts?: string[]
}

// === Cloud Function Request/Response Types ===
// Add these to your GenerateParlayRequest interface
export interface GenerateParlayRequest {
  game: NFLGame
  rosters: GameRosters
  strategy?: StrategyConfig
  varietyFactors?: VarietyFactors
  options?: {
    temperature?: number
    strategy?: string
    provider?: string
  }
}

export interface GenerateParlayResponse {
  success: boolean
  data?: GeneratedParlay
  error?: {
    code: string
    message: string
    details?: any
  }
  rateLimitInfo?: {
    remaining: number
    resetTime: string
    currentCount: number
    total: number
  }
  metadata?: {
    provider: string
    generatedAt: string
    rateLimitInfo: {
      remaining: number
      resetTime: string
    }
    aiProvider?: string
    model?: string
    tokens?: number
    latency?: number
    confidence?: number
    fallbackUsed?: boolean
    attemptCount?: number
    serviceMode?: AIProvider
    environment?: string
  }
}

// === OpenAI Types ===
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIRequest {
  model: string
  messages: OpenAIMessage[]
  temperature?: number
  max_tokens?: number
  response_format?: { type: 'json_object' }
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  seed?: number
}

// === Error Types ===
// Removed CloudFunctionError and ValidationResult - unused

// Removed EnhancedBetTypeSelector and related configurations - unused
