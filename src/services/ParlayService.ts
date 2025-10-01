// src/services/ParlayService.ts - V2 API implementation
import { API_CONFIG } from '../config/api'
import { auth } from '../config/firebase'
import {
  GeneratedParlay,
  GenerateParlayRequest,
  NFLGame,
  ParlayGenerationResult,
} from '../types'
import { RateLimitError } from '../types/errors'

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

    // Use API_CONFIG for consistent URL management
    const baseUrl = API_CONFIG.CLOUD_FUNCTIONS.baseURL

    this.cloudFunctionUrl = `${baseUrl}${API_CONFIG.CLOUD_FUNCTIONS.endpoints.v2.generateParlay}`
    this.healthCheckUrl = `${baseUrl}${API_CONFIG.CLOUD_FUNCTIONS.endpoints.v2.health}`
  }

  /**
   * Generate a parlay with provider options
   */
  async generateParlay(
    game: NFLGame,
    options: { provider?: 'mock' | 'openai' } = {}
  ): Promise<EnhancedParlayGenerationResult> {
    try {
      // Check authentication before proceeding
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error(
          'User not authenticated. Please log in to generate parlays.'
        )
      }

      console.info('🔐 User authenticated:', {
        uid: currentUser.uid,
        email: currentUser.email,
        emailVerified: currentUser.emailVerified,
      })

      return await this.generateCloudParlay(game, options)
    } catch (error) {
      console.error('❌ Error generating parlay:', error)
      throw this.enhanceError(error as Error)
    }
  }

  /**
   * Generate parlay using cloud functions
   */
  private async generateCloudParlay(
    game: NFLGame,
    _options: { provider?: 'mock' | 'openai' }
  ): Promise<EnhancedParlayGenerationResult> {
    // V2 API handles roster fetching internally
    const parlayData = await this.callCloudFunction(game)

    // V2 API returns the parlay data directly
    return {
      parlay: parlayData,
      rateLimitInfo: undefined, // V2 doesn't return rate limit info yet
      metadata: undefined, // V2 doesn't return metadata yet
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

  // Note: getGameRosters method removed - v2 API handles roster data internally

  // Removed roster validation; v2 backend handles data readiness

  /**
   * Call v2 cloud function to generate parlay
   */
  private async callCloudFunction(game: NFLGame): Promise<GeneratedParlay> {
    try {
      const authToken = await this.getAuthToken()

      if (!authToken) {
        throw new Error(
          'No authentication token available. Please log in again.'
        )
      }

      const requestBody: GenerateParlayRequest = {
        gameId: game.id,
        numLegs: 3,
        week: game.week,
        riskLevel: 'conservative', // Default risk level
        betTypes: 'all',
      }

      console.info('🚀 Making parlay generation request:', {
        url: this.cloudFunctionUrl,
        gameId: game.id,
        hasAuthToken: !!authToken,
        tokenLength: authToken.length,
      })

      const response = await fetch(this.cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
      })

      const responseData = await response.json()

      if (!response.ok) {
        console.error('[CF FAIL]', {
          status: response.status,
          statusText: response.statusText,
          url: this.cloudFunctionUrl,
          hasAuthToken: !!authToken,
          body: responseData,
        })

        // Handle v2 error format
        if (responseData.code && responseData.message) {
          throw new Error(`${responseData.code}: ${responseData.message}`)
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      console.info('✅ Parlay generation successful')
      return responseData
    } catch (error) {
      console.error('❌ Cloud Function call failed:', error)
      throw this.enhanceNetworkError(error as Error)
    }
  }

  // Removed unused error response handler; direct errors are thrown above

  /**
   * Enhance network errors
   */
  private enhanceNetworkError(
    error: Error | TypeError | RateLimitError
  ): Error {
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
  private enhanceError(error: Error | RateLimitError): Error {
    if (error instanceof RateLimitError || error instanceof Error) {
      return error
    }

    return new Error(`Parlay generation failed: ${String(error)}`)
  }

  /**
   * Get Firebase auth token with refresh handling
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        console.warn('No authenticated user found')
        return null
      }

      // Check if user is still valid
      if (!currentUser.emailVerified && currentUser.providerData.length === 0) {
        console.warn('User account may be invalid')
        return null
      }

      // Force refresh the token to ensure it's valid
      const token = await currentUser.getIdToken(true)
      console.info('✅ Auth token obtained successfully', {
        uid: currentUser.uid,
        email: currentUser.email,
        tokenLength: token.length,
        tokenPreview: `${token.substring(0, 20)}...`,
      })
      return token
    } catch (error) {
      console.error('❌ Failed to get auth token:', error)
      // If token refresh fails, the user might need to re-authenticate
      if (
        error instanceof Error &&
        error.message.includes('auth/user-token-expired')
      ) {
        console.error('Token expired - user needs to re-authenticate')
      }
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
