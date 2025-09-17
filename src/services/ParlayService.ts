import { INFLClient } from '../api/clients/base/interfaces'
import { auth } from '../config/firebase'
import {
  GameRosters,
  GeneratedParlay,
  NFLGame,
  ParlayGenerationResult,
} from '../types'
import { RateLimitError } from '../types/errors'
import { NFLDataService } from './NFLDataService'

// Define strategy and variety factor types (can be simplified for client use)
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
  }
}

/**
 * Generation options for parlay creation
 */
export interface ParlayGenerationOptions {
  temperature?: number
  strategy?: StrategyConfig
  varietyFactors?: VarietyFactors
  provider?: 'openai' | 'anthropic' | 'google' | 'auto'
  debugMode?: boolean
}

/**
 * Enhanced ParlayGenerationResult with metadata support
 */
export interface EnhancedParlayGenerationResult extends ParlayGenerationResult {
  metadata?: {
    provider: string
    model: string
    tokens?: number
    latency: number
    confidence: number
    fallbackUsed: boolean
    attemptCount: number
  }
}

/**
 * Enhanced Parlay Service
 * Intelligently routes between local mock service and cloud functions
 * Provides seamless development experience with production security
 */
export class ParlayService {
  private readonly cloudFunctionUrl: string
  private readonly healthCheckUrl: string
  private readonly shouldUseMock: boolean

  constructor(
    private nflClient: INFLClient,
    private nflDataService: NFLDataService
  ) {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID

    if (!projectId) {
      throw new Error(
        'VITE_FIREBASE_PROJECT_ID environment variable is required'
      )
    }

    // Auto-detect mock mode
    this.shouldUseMock =
      import.meta.env.MODE === 'development' &&
      import.meta.env.VITE_USE_MOCK_OPENAI === 'true'

    // Cloud function URLs
    const baseUrl =
      import.meta.env.VITE_CLOUD_FUNCTION_URL ||
      (import.meta.env.DEV
        ? `http://localhost:5001/${projectId}/us-central1`
        : `https://us-central1-${projectId}.cloudfunctions.net`)

    this.cloudFunctionUrl = `${baseUrl}/generateParlay`
    this.healthCheckUrl = `${baseUrl}/healthCheck`

    if (this.shouldUseMock) {
      console.log('🎭 ParlayService: Using mock AI service for development')
    }
  }

  /**
   * Generate a parlay - routes to mock or cloud function based on environment
   */
  async generateParlay(
    game: NFLGame,
    options: ParlayGenerationOptions = {}
  ): Promise<EnhancedParlayGenerationResult> {
    try {
      // Route to appropriate service
      if (this.shouldUseMock) {
        return await this.generateMockParlay(game, options)
      } else {
        return await this.generateCloudParlay(game, options)
      }
    } catch (error) {
      console.error('❌ Error generating parlay:', error)
      throw this.enhanceError(error)
    }
  }

  /**
   * Generate parlay using local mock service
   */
  private async generateMockParlay(
    game: NFLGame,
    options: ParlayGenerationOptions
  ): Promise<EnhancedParlayGenerationResult> {
    try {
      if (options.debugMode) {
        console.log(
          '🎭 Using mock service for:',
          game.awayTeam.displayName,
          '@',
          game.homeTeam.displayName
        )
      }

      // Dynamic import to ensure mock code is tree-shaken in production
      const { mockOpenAIService } = await import('./mockOpenaiService')

      const startTime = Date.now()
      const parlay = await mockOpenAIService.generateParlay(game)
      const latency = Date.now() - startTime

      return {
        parlay,
        rateLimitInfo: {
          remaining: 999,
          total: 1000,
          resetTime: new Date(Date.now() + 3600000).toISOString(),
          currentCount: 1,
        },
        metadata: {
          provider: 'mock',
          model: 'mock-gpt-4o-mini',
          latency,
          confidence: parlay.overallConfidence,
          fallbackUsed: false,
          attemptCount: 1,
        },
      }
    } catch (error) {
      console.error('❌ Mock service error:', error)
      throw error
    }
  }

  /**
   * Generate parlay using cloud functions
   */
  private async generateCloudParlay(
    game: NFLGame,
    options: ParlayGenerationOptions
  ): Promise<EnhancedParlayGenerationResult> {
    // Step 1: Get team rosters
    const rosters = await this.getGameRosters(game)

    // Step 2: Validate rosters
    this.validateRosters(rosters)

    // Step 3: Call cloud function
    const response = await this.callCloudFunction(game, rosters, options)

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
   * Check service health (mock or cloud)
   */
  async checkServiceHealth(): Promise<{
    healthy: boolean
    mode: 'mock' | 'cloud'
    providers?: Array<{
      name: string
      healthy: boolean
      latency?: number
      lastError?: string
    }>
    timestamp: string
  }> {
    if (this.shouldUseMock) {
      return {
        healthy: true,
        mode: 'mock',
        providers: [
          {
            name: 'mock',
            healthy: true,
            latency: 50,
          },
        ],
        timestamp: new Date().toISOString(),
      }
    }

    try {
      const authToken = await this.getAuthToken()

      const response = await fetch(this.healthCheckUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }

      return {
        ...data.data,
        mode: 'cloud' as const,
      }
    } catch (error) {
      console.error('Health check failed:', error)
      return {
        healthy: false,
        mode: 'cloud',
        providers: [],
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Get rosters for both teams
   */
  async getGameRosters(game: NFLGame): Promise<GameRosters> {
    try {
      const [homeRosterResponse, awayRosterResponse] = await Promise.all([
        this.nflClient.getTeamRoster(game.homeTeam.id),
        this.nflClient.getTeamRoster(game.awayTeam.id),
      ])

      return {
        homeRoster: this.nflDataService.transformRosterResponse(
          homeRosterResponse.data
        ),
        awayRoster: this.nflDataService.transformRosterResponse(
          awayRosterResponse.data
        ),
      }
    } catch (error) {
      console.error('Error fetching game rosters:', error)
      throw new Error('Failed to fetch team rosters. Please try again.')
    }
  }

  /**
   * Validate roster data
   */
  private validateRosters(rosters: GameRosters): void {
    if (!rosters || !rosters.homeRoster || !rosters.awayRoster) {
      throw new Error('Missing roster data for one or both teams')
    }

    if (rosters.homeRoster.length === 0) {
      throw new Error('No home team roster data available')
    }

    if (rosters.awayRoster.length === 0) {
      throw new Error('No away team roster data available')
    }

    // Check for minimum required positions
    const requiredPositions = ['QB', 'RB', 'WR']

    const getPositionString = (
      position: string | { abbreviation?: string } | undefined
    ): string | undefined => {
      if (!position) return undefined
      if (typeof position === 'string') return position
      return position.abbreviation
    }

    const homePositions = new Set(
      rosters.homeRoster
        .map(p => getPositionString(p.position))
        .filter((pos): pos is string => Boolean(pos))
    )
    const awayPositions = new Set(
      rosters.awayRoster
        .map(p => getPositionString(p.position))
        .filter((pos): pos is string => Boolean(pos))
    )

    for (const pos of requiredPositions) {
      if (!homePositions.has(pos) || !awayPositions.has(pos)) {
        console.warn(`⚠️ Missing ${pos} position data for complete analysis`)
      }
    }
  }

  /**
   * Call Firebase Cloud Function
   */
  private async callCloudFunction(
    game: NFLGame,
    rosters: GameRosters,
    options: ParlayGenerationOptions = {}
  ): Promise<CloudFunctionResponse> {
    try {
      const authToken = await this.getAuthToken()

      const requestBody = {
        game,
        rosters,
        strategy: options.strategy,
        varietyFactors: options.varietyFactors,
        options: {
          temperature: options.temperature,
          provider: options.provider,
          debugMode: options.debugMode,
        },
      }

      if (options.debugMode) {
        console.log('🔍 Cloud Function Request:', {
          game: game.id,
          homeTeam: game.homeTeam.displayName,
          awayTeam: game.awayTeam.displayName,
          options: requestBody.options,
        })
      }

      const startTime = Date.now()
      const response = await fetch(this.cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(requestBody),
      })

      const responseData = await response.json()
      const latency = Date.now() - startTime

      if (options.debugMode) {
        console.log('📡 Cloud Function Response:', {
          status: response.status,
          latency: `${latency}ms`,
          success: responseData.success,
          provider: responseData.metadata?.provider,
        })
      }

      if (!response.ok) {
        return this.handleErrorResponse(response, responseData)
      }

      return responseData
    } catch (error) {
      console.error('❌ Cloud Function call failed:', error)
      throw this.enhanceNetworkError(error)
    }
  }

  /**
   * Handle error responses from cloud function
   */
  private handleErrorResponse(response: Response, responseData: any): never {
    if (response.status === 429) {
      const resetTime = responseData.error?.details?.resetTime
      const remaining = responseData.error?.details?.remaining || 0

      throw new RateLimitError(
        responseData.error?.message || 'Rate limit exceeded',
        {
          remaining,
          resetTime: resetTime ? new Date(resetTime) : new Date(),
          currentCount: responseData.error?.details?.currentCount || 0,
        }
      )
    }

    const errorMessage =
      responseData.error?.message ||
      `HTTP ${response.status}: ${response.statusText}`

    switch (response.status) {
      case 400:
        throw new Error(`Invalid request: ${errorMessage}`)
      case 401:
        throw new Error(
          'Authentication required. Please sign in and try again.'
        )
      case 403:
        throw new Error(
          'Access denied. You may not have permission to use this service.'
        )
      case 500:
        throw new Error(
          'Service temporarily unavailable. Please try again in a moment.'
        )
      case 503:
        throw new Error(
          'AI service is currently unavailable. Please try again later.'
        )
      default:
        throw new Error(errorMessage)
    }
  }

  /**
   * Enhance network errors
   */
  private enhanceNetworkError(error: unknown): Error {
    if (error instanceof RateLimitError) {
      return error
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new Error(
        'Unable to connect to the parlay generation service. Please check your internet connection.'
      )
    }

    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      return new Error(
        'Network error: Unable to reach the parlay generation service. Please try again.'
      )
    }

    if (error instanceof Error) {
      return error
    }

    return new Error(`Unexpected error: ${String(error)}`)
  }

  /**
   * Enhance any error with context
   */
  private enhanceError(error: unknown): Error {
    if (error instanceof RateLimitError || error instanceof Error) {
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
  getServiceMode(): 'mock' | 'cloud' {
    return this.shouldUseMock ? 'mock' : 'cloud'
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
