import { auth } from '../config/firebase'
import { DEFAULT_STRATEGIES, DEFAULT_VARIETY_FACTORS } from '../constants'
import {
  GameRosters,
  GeneratedParlay,
  NFLGame,
  ParlayGenerationResult,
  StrategyConfig,
  VarietyFactors,
} from '../types'
import { container } from './container'

// Define RateLimitError class since it's missing
export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

interface CloudFunctionResponse {
  success: boolean
  data?: GeneratedParlay
  error?: {
    code?: string
    message?: string
    details?: {
      remaining?: number
      resetTime?: string
      currentCount?: number
      retryAfter?: number
    }
  }
  rateLimitInfo?: {
    remaining: number
    resetTime: string
    currentCount: number
    total: number
  }
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

export interface ParlayGenerationOptions {
  temperature?: number
  strategy?: StrategyConfig // Always rich object
  varietyFactors?: VarietyFactors // Always rich object
  provider?: 'mock' | 'openai'
  debugMode?: boolean
}

export interface EnhancedParlayGenerationResult extends ParlayGenerationResult {
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

export class ParlayService {
  private readonly cloudFunctionUrl: string
  private readonly healthCheckUrl: string

  constructor() {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID

    if (!projectId) {
      throw new Error(
        'VITE_FIREBASE_PROJECT_ID environment variable is required'
      )
    }

    // Cloud function URLs
    const baseUrl =
      import.meta.env.VITE_CLOUD_FUNCTION_URL ||
      (import.meta.env.DEV
        ? `http://localhost:5001/${projectId}/us-central1`
        : `https://us-central1-${projectId}.cloudfunctions.net`)

    this.cloudFunctionUrl = `${baseUrl}/generateParlay`
    this.healthCheckUrl = `${baseUrl}/healthCheck`
  }

  /**
   * Generate a parlay with rich object options
   */
  async generateParlay(
    game: NFLGame,
    options: ParlayGenerationOptions = {}
  ): Promise<EnhancedParlayGenerationResult> {
    try {
      return await this.generateCloudParlay(game, options)
    } catch (error) {
      console.error('❌ Error generating parlay:', error)
      throw this.enhanceError(error)
    }
  }

  /**
   * Generate parlay using cloud functions with rich objects
   */
  private async generateCloudParlay(
    game: NFLGame,
    options: ParlayGenerationOptions
  ): Promise<EnhancedParlayGenerationResult> {
    // Step 1: Get team rosters
    const rosters = await this.getGameRosters(game)

    // Step 2: Validate rosters
    this.validateRosters(rosters)

    // Step 3: Prepare rich object payload
    const payload = {
      gameId: game.id,
      options: {
        strategy: options.strategy || this.getDefaultStrategy(),
        variety: options.varietyFactors || DEFAULT_VARIETY_FACTORS,
        temperature: options.temperature,
        provider: options.provider,
      },
    }

    console.log('🚀 Sending parlay generation request:', {
      gameId: game.id,
      strategy: payload.options.strategy,
      provider: payload.options.provider || 'auto',
    })

    // Step 4: Call cloud function
    const response = await this.callCloudFunction(payload)

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to generate parlay')
    }

    return {
      parlay: response.data,
      rateLimitInfo: response.rateLimitInfo,
      metadata: response.metadata,
    }
  }

  /**
   * Call cloud function with rich object payload
   */
  private async callCloudFunction(
    payload: any
  ): Promise<CloudFunctionResponse> {
    const authToken = await this.getAuthToken()

    const response = await fetch(this.cloudFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw this.createHttpError(response.status, errorData)
    }

    return response.json()
  }

  /**
   * Get team rosters for the game using container
   */
  private async getGameRosters(game: NFLGame): Promise<GameRosters> {
    try {
      // Use container.nflData instead of container.get('nflClient')
      const nflClient = container.nflData

      // Get rosters for both teams
      const [homeRoster, awayRoster] = await Promise.all([
        nflClient.teamRoster(game.homeTeam.id),
        nflClient.teamRoster(game.awayTeam.id),
      ])

      return {
        gameId: game.id,
        home: homeRoster || [],
        away: awayRoster || [],
      }
    } catch (error) {
      console.error('Failed to get game rosters:', error)
      throw new Error('Unable to fetch team rosters. Please try again.')
    }
  }

  /**
   * Validate roster data
   */
  private validateRosters(rosters: GameRosters): void {
    if (!rosters.home || !rosters.away) {
      throw new Error('Missing roster data for one or both teams')
    }

    if (rosters.home.length === 0 || rosters.away.length === 0) {
      throw new Error('Empty roster data for one or both teams')
    }

    console.log(
      `✅ Rosters validated: ${rosters.home.length} home, ${rosters.away.length} away players`
    )
  }

  /**
   * Get available strategy presets - Fixed: return mutable array
   */
  getAvailableStrategies(): string[] {
    // Convert readonly array to mutable array
    return [...DEFAULT_STRATEGIES]
  }

  /**
   * Get default strategy configuration
   */
  private getDefaultStrategy(): StrategyConfig {
    return {
      name: 'Balanced',
      description: 'Mix of spread, props, and totals with moderate risk',
      riskLevel: 'medium',
      temperature: 0.7,
      focusArea: 'balanced',
      maxLegs: 3,
    }
  }

  /**
   * Create custom strategy - Fixed: return proper StrategyConfig
   */
  createCustomStrategy(
    name: string,
    overrides: Partial<StrategyConfig> = {}
  ): StrategyConfig {
    return {
      ...this.getDefaultStrategy(),
      name,
      ...overrides,
    }
  }

  /**
   * Get default variety factors
   */
  getDefaultVarietyFactors(): VarietyFactors {
    return DEFAULT_VARIETY_FACTORS
  }

  /**
   * Check service health with provider options
   */
  async checkServiceHealth(
    options: { provider?: 'mock' | 'openai' } = {}
  ): Promise<{
    healthy: boolean
    mode: 'mock' | 'openai'
    providers?: Array<{
      name: string
      healthy: boolean
      latency?: number
      lastError?: string
    }>
    timestamp: string
  }> {
    try {
      const authToken = await this.getAuthToken()

      const response = await fetch(this.healthCheckUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      })

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }

      const data = await response.json()
      return {
        healthy: data.healthy || false,
        mode: options.provider || data.mode || 'openai',
        providers: data.providers,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.warn('Health check failed:', error)
      return {
        healthy: false,
        mode: options.provider || 'openai',
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Create HTTP error with proper status handling - Fixed: return Error instead of throw
   */
  private createHttpError(status: number, errorData: any): Error {
    const errorMessage =
      errorData?.error?.message || errorData?.message || 'Unknown error'

    switch (status) {
      case 429:
        // RateLimitError constructor takes message and optional retryAfter
        return new RateLimitError(
          errorMessage,
          errorData?.error?.details?.retryAfter
        )
      case 401:
        return new Error(
          'Authentication required. Please sign in and try again.'
        )
      case 403:
        return new Error(
          'Access denied. You may not have permission to use this service.'
        )
      case 500:
        return new Error(
          'Service temporarily unavailable. Please try again in a moment.'
        )
      case 503:
        return new Error(
          'AI service is currently unavailable. Please try again later.'
        )
      default:
        return new Error(errorMessage)
    }
  }

  /**
   * Enhance any error with context - Fixed: proper error handling
   */
  private enhanceError(error: unknown): Error {
    if (error instanceof RateLimitError) {
      return error
    }

    if (error instanceof Error) {
      return error
    }

    return new Error(`Parlay generation failed: ${String(error)}`)
  }

  /**
   * Get Firebase auth token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const currentUser = auth.currentUser
      if (currentUser) {
        return await currentUser.getIdToken()
      }
      return null
    } catch (error) {
      console.warn('Failed to get auth token:', error)
      return null
    }
  }

  /**
   * Get service mode for debugging
   */
  getServiceMode(provider?: 'mock' | 'openai'): 'mock' | 'openai' {
    return provider || 'openai'
  }

  /**
   * Get cloud function URL for debugging
   */
  getCloudFunctionUrl(): string {
    return this.cloudFunctionUrl
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!import.meta.env.VITE_FIREBASE_PROJECT_ID
  }
}
