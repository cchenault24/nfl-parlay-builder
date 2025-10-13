// src/services/RealParlayService.ts - Real API implementation
import { API_CONFIG } from '../config/api'
import { auth } from '../config/firebase'
import {
  Game,
  GenerateParlayRequest,
  GenerateParlayResponse,
  ParlayGenerationOptions,
  ParlayGenerationResult,
} from '../types'
import { RateLimitError } from '../types/errors'
import { BaseParlayService } from './BaseParlayService'
import { FrontendRateLimiter } from './FrontendRateLimiter'

/**
 * Real parlay service that makes API calls to cloud functions
 */
export class RealParlayService extends BaseParlayService {
  private readonly cloudFunctionUrl: string
  private readonly healthCheckUrl: string

  constructor() {
    super()
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID

    if (!projectId) {
      throw new Error(
        'VITE_FIREBASE_PROJECT_ID environment variable is required'
      )
    }

    const baseUrl = API_CONFIG.CLOUD_FUNCTIONS.baseURL

    this.cloudFunctionUrl = `${baseUrl}${API_CONFIG.CLOUD_FUNCTIONS.endpoints.generateParlay}`
    this.healthCheckUrl = `${baseUrl}${API_CONFIG.CLOUD_FUNCTIONS.endpoints.health}`
  }

  /**
   * Generate parlay using cloud functions
   */
  async generateParlay(
    game: Game,
    options: ParlayGenerationOptions = {}
  ): Promise<ParlayGenerationResult> {
    try {
      const { onLoadingUpdate } = options
      const startTime = Date.now()
      // Check frontend rate limit first (for consistency with mock mode)
      const userId = auth.currentUser?.uid || null
      const frontendRateLimit = await FrontendRateLimiter.checkAndIncrement(
        20,
        60 * 60 * 1000,
        userId
      )

      if (!frontendRateLimit.allowed) {
        throw new Error(
          `Rate limit exceeded. You have used all ${frontendRateLimit.rateLimitInfo.total} parlay generations for this hour. Please wait until ${frontendRateLimit.rateLimitInfo.resetTime.toLocaleTimeString()} before generating more parlays.`
        )
      }

      // Require authentication for real API calls
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error(
          'User not authenticated. Please log in to generate parlays.'
        )
      }

      // Phase 1: Retrieving Stats
      if (onLoadingUpdate) {
        onLoadingUpdate({
          phase: 'retrieving_stats',
          progress: 0,
          message: 'Getting latest team and player statistics...',
          estimatedTimeRemaining: 30000,
        })
      }

      const result = await this.callCloudFunction(game)
      const latency = Date.now() - startTime

      // Use frontend rate limit info for consistency (backend rate limiting is still enforced)
      return {
        parlay: result.parlay,
        gameData: result.gameData,
        rateLimitInfo: {
          remaining: frontendRateLimit.rateLimitInfo.remaining,
          total: frontendRateLimit.rateLimitInfo.total,
          resetTime: frontendRateLimit.rateLimitInfo.resetTime.toISOString(),
          currentCount: frontendRateLimit.rateLimitInfo.currentCount,
        },
        metadata: this.createMetadata(
          'openai',
          'gpt-4',
          latency,
          result.parlay.parlayConfidence,
          {
            serviceMode: 'openai',
            tokens: 0, // API doesn't return token count
          }
        ),
      }
    } catch (error) {
      throw this.enhanceError(error as Error)
    }
  }

  /**
   * Check service health
   */
  async checkServiceHealth(): Promise<{
    healthy: boolean
    mode: 'openai'
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
        mode: 'openai',
        providers: data.data?.service?.providers || [],
        timestamp: new Date().toISOString(),
      }
    } catch {
      return {
        healthy: false,
        mode: 'openai',
        providers: [],
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Get service mode for debugging
   */
  getServiceMode(): 'openai' {
    return 'openai'
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!import.meta.env.VITE_FIREBASE_PROJECT_ID
  }

  /**
   * Get cloud function URL for debugging
   */
  getCloudFunctionUrl(): string {
    return this.cloudFunctionUrl
  }

  /**
   * Call v2 cloud function to generate parlay
   */
  private async callCloudFunction(game: Game): Promise<GenerateParlayResponse> {
    try {
      const authToken = await this.getAuthToken()

      if (!authToken) {
        throw new Error(
          'No authentication token available. Please log in again.'
        )
      }

      const requestBody: GenerateParlayRequest = {
        gameId: game.gameId,
        numLegs: 3,
        week: game.week,
        riskLevel: 'conservative', // Default risk level
        betTypes: 'all',
      }

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
        // Handle v2 error format
        if (responseData.code && responseData.message) {
          throw new Error(`${responseData.code}: ${responseData.message}`)
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return responseData as GenerateParlayResponse
    } catch (error) {
      throw this.enhanceNetworkError(error as Error)
    }
  }

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
   * Get Firebase auth token with refresh handling
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const currentUser = auth.currentUser
      if (
        !currentUser ||
        (!currentUser.emailVerified && currentUser.providerData.length === 0)
      ) {
        return null
      }

      // Force refresh the token to ensure it's valid
      const token = await currentUser.getIdToken(true)
      return token
    } catch (error) {
      // If token refresh fails, the user might need to re-authenticate
      if (
        error instanceof Error &&
        error.message.includes('auth/user-token-expired')
      ) {
        // Token expired, user needs to re-authenticate
      }
      return null
    }
  }
}
