// src/services/ParlayService.ts - Complete fix for UI provider selection
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
    serviceMode?: 'mock' | 'openai'
    environment?: string
  }
}

export interface ParlayGenerationOptions {
  temperature?: number
  strategy?: StrategyConfig
  varietyFactors?: VarietyFactors
  provider?: 'mock' | 'openai' | 'openai' // Updated to include mock/real
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

interface CloudFunctionErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: {
      remaining?: number
      resetTime?: string
      currentCount?: number
      [key: string]: unknown // Allow for additional error details
    }
  }
  [key: string]: unknown // Allow for additional properties
}

export class ParlayService {
  private readonly cloudFunctionUrl: string
  private readonly healthCheckUrl: string

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
   * Generate a parlay with provider options
   */
  async generateParlay(
    game: NFLGame,
    options: { provider?: 'mock' | 'openai' } = {}
  ): Promise<EnhancedParlayGenerationResult> {
    try {
      return await this.generateCloudParlay(game, options)
    } catch (error) {
      console.error('❌ Error generating parlay:', error)
      throw this.enhanceError(error)
    }
  }

  /**
   * Generate parlay using cloud functions
   */
  private async generateCloudParlay(
    game: NFLGame,
    options: { provider?: 'mock' | 'openai' }
  ): Promise<EnhancedParlayGenerationResult> {
    // Step 1: Get team rosters
    const rosters = await this.getGameRosters(game)

    // Step 2: Validate rosters
    this.validateRosters(rosters)

    // Step 3: Call cloud function with provider option
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
   * Check service health (updated to work with cloud functions)
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

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }

      return {
        healthy: data.success,
        mode: options.provider || 'openai',
        providers: data.data?.service?.providers || [],
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Health check failed:', error)
      return {
        healthy: false,
        mode: options.provider || 'openai',
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
   * Validate that rosters have sufficient data
   */
  private validateRosters(rosters: GameRosters): void {
    if (!rosters.homeRoster || rosters.homeRoster.length < 10) {
      throw new Error(
        'Insufficient home team roster data. Please try again later.'
      )
    }

    if (!rosters.awayRoster || rosters.awayRoster.length < 10) {
      throw new Error(
        'Insufficient away team roster data. Please try again later.'
      )
    }
  }

  /**
   * Call cloud function with provider selection
   */
  private async callCloudFunction(
    game: NFLGame,
    rosters: GameRosters,
    options: { provider?: 'mock' | 'openai' }
  ): Promise<CloudFunctionResponse> {
    try {
      const authToken = await this.getAuthToken()

      const requestBody = {
        game,
        rosters,
        options: {
          provider: options.provider || 'openai', // Default to real if not specified
        },
      }

      const response = await fetch(this.cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(requestBody),
      })

      const responseData = await response.json()
      if (!response.ok) {
        console.error('[CF FAIL]', {
          status: response.status,
          statusText: response.statusText,
          trace: null,
          execId: null,
          body: responseData,
        })

        // Type assertion to ensure we have the right error structure
        const errorResponse: CloudFunctionErrorResponse = {
          success: false,
          error: {
            code: responseData.error?.code || 'UNKNOWN_ERROR',
            message:
              responseData.error?.message ||
              `HTTP ${response.status}: ${response.statusText}`,
            details: responseData.error?.details,
          },
          ...responseData, // Spread any additional properties
        }

        return this.handleErrorResponse(response, errorResponse)
      }

      return responseData
    } catch (error) {
      console.error('❌ Cloud Function call failed:', error)
      throw this.enhanceNetworkError(error)
    }
  }

  private handleErrorResponse(
    response: Response,
    responseData: CloudFunctionErrorResponse
  ): never {
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
   * Get service mode for debugging (now takes provider parameter)
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
