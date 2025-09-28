// ================================================================================================
// AI PROVIDER INTERFACES - AI model provider abstraction
// ================================================================================================

import {
  GameRosters,
  GeneratedParlay,
  NFLGame,
  StrategyConfig,
  VarietyFactors,
} from '../domain'
import { IProvider, ProviderConfig, ProviderMetadata } from './base'

/**
 * AI provider generation context
 */
export interface AIGenerationContext {
  strategy: StrategyConfig
  varietyFactors: VarietyFactors
  gameContext: GameContext
  antiTemplateHints: AntiTemplateHints
  temperature?: number
  maxTokens?: number
}

/**
 * Game-specific context for AI generation
 */
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
    spreadConsensus: number
    totalConsensus: number
  }
}

/**
 * Anti-template hints to prevent repetitive AI responses
 */
export interface AntiTemplateHints {
  recentBetTypes: string[]
  contextualFactors: string[]
  avoidPatterns: string[]
  emphasizeUnique: string[]
}

/**
 * Player injury information
 */
export interface PlayerInjury {
  playerId: string
  playerName: string
  position: string
  team: string
  injuryType: string
  status: 'out' | 'doubtful' | 'questionable' | 'probable'
  bodyPart: string
}

/**
 * AI provider response metadata
 */
export interface AIProviderResponse {
  parlay: GeneratedParlay
  metadata: {
    provider: string
    model: string
    tokens?: number
    latency: number
    confidence: number
    cost?: number
  }
}

/**
 * AI provider configuration
 */
export interface AIProviderConfig extends ProviderConfig {
  model: string
  temperature: number
  maxTokens: number
  apiKey?: string
  baseURL?: string
  organization?: string
  debugMode?: boolean
}

/**
 * AI provider metadata
 */
export interface AIProviderMetadata extends ProviderMetadata {
  type: 'ai'
  supportedModels: string[]
  maxTokens: number
  supportsStreaming: boolean
  supportsJsonMode: boolean
}

/**
 * AI Provider interface for all AI model providers
 */
export interface IAIProvider extends IProvider {
  readonly metadata: AIProviderMetadata
  readonly config: AIProviderConfig

  /**
   * Generate a parlay using AI
   */
  generateParlay(
    game: NFLGame,
    rosters: GameRosters,
    context: AIGenerationContext
  ): Promise<AIProviderResponse>

  /**
   * Get available models for this provider
   */
  getAvailableModels(): string[]

  /**
   * Update model configuration
   */
  updateModel(model: string, config?: Partial<AIProviderConfig>): void

  /**
   * Get cost estimate for a request
   */
  estimateCost(context: AIGenerationContext): number
}

/**
 * AI Provider types
 */
export type AIProviderType = 'openai' | 'anthropic' | 'google' | 'mock'

/**
 * AI Provider factory configuration
 */
export interface AIProviderFactoryConfig {
  type: AIProviderType
  config: Partial<AIProviderConfig>
  apiKey?: string
}
