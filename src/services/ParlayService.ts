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
}

/**
 * Updated Parlay Service
 * Now calls Firebase Cloud Function instead of OpenAI directly
 * This removes the security vulnerability of exposing API keys client-side
 */
export class ParlayService {
  private readonly cloudFunctionUrl: string

  constructor(
    private nflClient: INFLClient,
    private nflDataService: NFLDataService
  ) {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID

    this.cloudFunctionUrl = import.meta.env.DEV
      ? `http://localhost:5001/${projectId}/us-central1/generateParlay`
      : `https://us-central1-${projectId}.cloudfunctions.net/generateParlay`
  }

  /**
   * Generate a parlay for a specific game
   */
  async generateParlay(game: NFLGame): Promise<ParlayGenerationResult> {
    try {
      // Step 1: Get team rosters for accurate player props
      const rosters = await this.getGameRosters(game)

      // Step 2: Validate rosters - throw error if insufficient data
      if (rosters.homeRoster.length === 0 || rosters.awayRoster.length === 0) {
        console.warn('⚠️ No roster data available')
        throw new Error('Insufficient roster data to generate parlay')
      }

      // Step 3: Call Firebase Cloud Function
      const response = await this.callCloudFunction(game, rosters)

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to generate parlay')
      }

      // Return both parlay and rate limit info
      return {
        parlay: response.data,
        rateLimitInfo: response.rateLimitInfo,
      }
    } catch (error) {
      console.error('❌ Error generating parlay:', error)
      throw error
    }
  }
  /**
   * Get rosters for both teams in a game
   * Business logic method that combines multiple NFL API calls
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
      return { homeRoster: [], awayRoster: [] }
    }
  }

  /**
   * Call Firebase Cloud Function for parlay generation
   */
  private async callCloudFunction(
    game: NFLGame,
    rosters: GameRosters,
    options: { temperature?: number; strategy?: string } = {}
  ): Promise<CloudFunctionResponse> {
    try {
      const authToken = await this.getAuthToken()

      const requestBody = {
        game,
        rosters,
        options,
      }

      const response = await fetch(this.cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken
            ? {
                Authorization: `Bearer ${authToken}`,
              }
            : {}),
        },
        body: JSON.stringify(requestBody),
      })

      const responseData = await response.json()

      if (!response.ok) {
        // Handle rate limit error specifically
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

        console.error('❌ Cloud Function error:', responseData)
        throw new Error(
          responseData.error?.message ||
            `HTTP ${response.status}: ${response.statusText}`
        )
      }

      return responseData
    } catch (error) {
      console.error('❌ Cloud Function call failed:', error)

      // Re-throw rate limit errors as-is
      if (error instanceof RateLimitError) {
        throw error
      }

      // Handle other error cases
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          'Unable to connect to parlay generation service. Please check your internet connection.'
        )
      }

      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        throw new Error(
          'Network error: Unable to reach parlay generation service. Please try again.'
        )
      }

      if (error instanceof Error) {
        throw error
      } else {
        throw new Error(`Unexpected error: ${String(error)}`)
      }
    }
  }

  /**
   * Get auth token from Firebase Auth
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
}
