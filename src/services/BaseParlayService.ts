import { Game, GameData, ParlayGenerationResult } from '../types'

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
}

export interface EnhancedParlayGenerationResult extends ParlayGenerationResult {
  gameData?: GameData
  metadata?: {
    provider: string
    model: string
    tokens?: number
    latency: number
    confidence: number
    fallbackUsed: boolean
    attemptCount: number
    serviceMode?: 'mock' | 'openai'
    environment?: string
  }
}

/**
 * Base abstract class for parlay services
 * Contains common interfaces and shared functionality
 */
export abstract class BaseParlayService {
  /**
   * Generate a parlay for the given game
   */
  abstract generateParlay(
    game: Game,
    options?: ParlayGenerationOptions
  ): Promise<EnhancedParlayGenerationResult>

  /**
   * Check service health
   */
  abstract checkServiceHealth(): Promise<{
    healthy: boolean
    mode: 'mock' | 'openai'
    providers?: Array<{
      name: string
      healthy: boolean
      latency?: number
      lastError?: string
    }>
    timestamp: string
  }>

  /**
   * Get service mode for debugging
   */
  abstract getServiceMode(): 'mock' | 'openai'

  /**
   * Check if service is properly configured
   */
  abstract isConfigured(): boolean

  /**
   * Enhance any error with context
   */
  protected enhanceError(error: Error): Error {
    return new Error(`Parlay generation failed: ${String(error)}`)
  }

  /**
   * Get environment mode
   */
  protected getEnvironment(): string {
    return import.meta.env.MODE
  }

  /**
   * Create metadata object with common fields
   */
  protected createMetadata(
    provider: string,
    model: string,
    latency: number,
    confidence: number,
    additionalFields: Partial<EnhancedParlayGenerationResult['metadata']> = {}
  ): EnhancedParlayGenerationResult['metadata'] {
    return {
      provider,
      model,
      tokens: 0,
      latency,
      confidence,
      fallbackUsed: false,
      attemptCount: 1,
      environment: this.getEnvironment(),
      ...additionalFields,
    }
  }
}
