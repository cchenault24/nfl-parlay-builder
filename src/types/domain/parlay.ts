import { Timestamp } from 'firebase/firestore'
import { BaseEntity } from '../core/common'
import { NFLPlayer } from './nfl'

// ------------------------------------------------------------------------------------------------
// Parlay domain types (consolidating all betting types)
// ------------------------------------------------------------------------------------------------

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

export interface ParlayLeg extends BaseEntity {
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

export interface GeneratedParlay extends BaseEntity {
  legs: [ParlayLeg, ParlayLeg, ParlayLeg] // Exactly 3 legs
  gameContext: string
  aiReasoning: string
  overallConfidence: number
  estimatedOdds: string
  gameSummary?: GameSummary
  metadata?: ParlayMetadata
}

export interface ParlayMetadata {
  provider: string
  model: string
  tokens?: number
  latency: number
  confidence: number
  fallbackUsed: boolean
  attemptCount: number
  serviceMode?: 'mock' | 'openai'
  environment?: string
  generatedAt: string
  varietyScore?: number
  templateRisk?: 'low' | 'medium' | 'high'
}

export interface SavedParlay extends GeneratedParlay {
  userId: string
  savedAt: Timestamp
}

export interface ParlayRequest {
  gameId: string
  legCount: 3
}

export interface ParlayGenerationResult {
  parlay: GeneratedParlay
  rateLimitInfo?: RateLimitInfo
  metadata?: ParlayMetadata
}

export interface RateLimitInfo {
  remaining: number
  total: number
  resetTime: string
  currentCount: number
}

// Parlay generation configuration
export interface StrategyConfig {
  name: string
  description: string
  temperature: number
  riskProfile: 'low' | 'medium' | 'high'
  confidenceRange: [number, number]
  focusAreas?: string[]
  riskLevel?: 'conservative' | 'moderate' | 'aggressive'
  betTypeWeights?: Record<string, number>
  contextFactors?: string[]
  preferredGameScripts?: string[]
}

export interface VarietyFactors {
  strategy: string
  focusArea: 'offense' | 'defense' | 'special_teams' | 'balanced'
  playerTier: 'star' | 'role_player' | 'breakout_candidate' | 'veteran'
  gameScript: 'high_scoring' | 'defensive' | 'blowout' | 'close_game'
  marketBias: 'public_favorite' | 'sharp_play' | 'contrarian' | 'neutral'
  timeContext?: 'early_season' | 'mid_season' | 'late_season' | 'playoffs'
  motivationalFactors?: string[]
  focusPlayer?: NFLPlayer | null
  riskTolerance: number // 0.0 to 1.0
}

export interface ParlayGenerationOptions {
  temperature?: number
  strategy?: StrategyConfig
  varietyFactors?: VarietyFactors
  provider?: 'mock' | 'openai'
  debugMode?: boolean
}

// AI Provider types
export interface GameContext {
  weather?: {
    condition: 'indoor' | 'clear' | 'rain' | 'snow' | 'wind'
    temperature?: number
    windSpeed?: number
  }
  injuries: PlayerInjury[]
  restDays: {
    home: number
    away: number
  }
  isRivalry: boolean
  isPlayoffs: boolean
  isPrimeTime: boolean
  venue: {
    type: 'dome' | 'outdoor'
    surface: 'grass' | 'turf'
    homeFieldAdvantage: number
  }
  publicBetting?: {
    spreadConsensus: number // % on favorite
    totalConsensus: number // % on over
  }
}

export interface AntiTemplateHints {
  recentBetTypes: string[]
  contextualFactors: string[]
  avoidPatterns: string[]
  emphasizeUnique: string[]
}

export interface ParlayGenerationContext {
  strategy: StrategyConfig
  varietyFactors: VarietyFactors
  gameContext: GameContext
  antiTemplateHints: AntiTemplateHints
  temperature?: number
}

export interface PlayerInjury {
  playerId: string
  playerName: string
  position: string
  team: string
  injuryType: string
  status: 'out' | 'doubtful' | 'questionable' | 'probable'
  bodyPart: string
}
