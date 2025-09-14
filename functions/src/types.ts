/**
 * Shared types for Firebase Functions
 * These mirror the types from your client-side application
 */

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
export type BetType = 'spread' | 'total' | 'moneyline' | 'player_prop'

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
  legs: [ParlayLeg, ParlayLeg, ParlayLeg]
  gameContext: string
  aiReasoning: string
  overallConfidence: number
  estimatedOdds: string
  createdAt: string
  gameSummary: GameSummary
}

export interface GameRosters {
  homeRoster: NFLPlayer[]
  awayRoster: NFLPlayer[]
}

// === Cloud Function Request/Response Types ===
export interface GenerateParlayRequest {
  game: NFLGame
  options?: {
    temperature?: number
    strategy?: string
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
export class CloudFunctionError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'CloudFunctionError'
  }
}

// === Validation Types ===
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// === Strategy Types (matching client-side) ===
export interface StrategyConfig {
  name: string
  description: string
  temperature: number
  focusAreas: string[]
  riskLevel: 'conservative' | 'moderate' | 'aggressive'
}

export interface VarietyFactors {
  strategy: string
  focusPlayer: NFLPlayer | null
  gameScript: string
  riskTolerance: number
}
