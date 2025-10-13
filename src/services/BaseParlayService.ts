import { Game, ParlayGenerationOptions, ParlayGenerationResult } from '../types'

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
  ): Promise<ParlayGenerationResult>

  /**
   * Check service health
   */
  abstract checkServiceHealth(): Promise<{
    healthy: boolean
    mode: 'mock' | 'openai' | 'agent'
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
  abstract getServiceMode(): 'mock' | 'openai' | 'agent'

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
    additionalFields: Partial<ParlayGenerationResult['metadata']> = {}
  ): ParlayGenerationResult['metadata'] {
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
