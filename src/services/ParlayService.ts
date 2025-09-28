import { ParsedError } from '../types/api'
import { CloudFunctionResponse } from '../types/api/interfaces'
import { NFLPlayer } from '../types/domain/nfl'

export interface ParlayPreferences {
  game: {
    homeTeam: string
    awayTeam: string
    gameTime: string
    venue: string
  }
  rosters: {
    homeRoster: NFLPlayer[]
    awayRoster: NFLPlayer[]
  }
  strategy: {
    riskLevel: 'conservative' | 'moderate' | 'aggressive'
    targetOdds: number
    maxLegs: number
    minLegs: number
  }
  varietyFactors: {
    includePlayerProps: boolean
    includeGameProps: boolean
    includeTeamProps: boolean
    diversifyPositions: boolean
  }
  options: {
    budget: number
    excludeInjuredPlayers: boolean
    favoriteTeamBias?: string
  }
}

export class ParlayService {
  private provider: string
  private baseUrl: string

  constructor(provider: string = 'openai') {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID

    if (!projectId) {
      throw new Error(
        'VITE_FIREBASE_PROJECT_ID environment variable is required'
      )
    }

    this.provider = provider
    this.baseUrl =
      import.meta.env.VITE_CLOUD_FUNCTION_URL ||
      (import.meta.env.DEV
        ? `http://localhost:5001/${projectId}/us-central1`
        : `https://us-central1-${projectId}.cloudfunctions.net`)
  }

  async generateParlay(
    preferences: ParlayPreferences & { gameId?: string }
  ): Promise<CloudFunctionResponse> {
    if (import.meta.env.DEV) {
      console.info('🎯 Generating parlay with provider:', this.provider)
    }

    // Extract gameId from preferences first
    const { gameId, ...preferencesWithoutGameId } = preferences

    // Validate preferences (without gameId)
    this.validatePreferences(preferencesWithoutGameId)

    // Make the request with gameId, game data, and roster data as expected by Cloud Function
    const requestPayload = {
      gameId,
      game: preferences.game, // Include the complete game data
      rosters: preferences.rosters, // Include the complete roster data
      options: {
        provider: this.provider,
        strategy: preferences.strategy,
        variety: preferences.varietyFactors,
        temperature: 0.7,
      },
      timestamp: new Date().toISOString(),
    }

    return this.makeCloudFunctionRequest('generateParlay', requestPayload)
  }

  private validatePreferences(preferences: ParlayPreferences): void {
    if (!preferences.game?.homeTeam || !preferences.game?.awayTeam) {
      throw new Error('Game teams are required')
    }

    if (!preferences.strategy?.riskLevel) {
      throw new Error('Risk level is required')
    }

    if (preferences.strategy.maxLegs < preferences.strategy.minLegs) {
      throw new Error('Maximum legs cannot be less than minimum legs')
    }

    if (!preferences.options?.budget || preferences.options.budget <= 0) {
      throw new Error('Valid budget is required')
    }
  }

  private async makeCloudFunctionRequest(
    endpoint: string,
    data: Record<string, unknown>
  ): Promise<CloudFunctionResponse> {
    if (import.meta.env.DEV) {
      console.info('🔍 Request endpoint:', endpoint)
      console.info('🔍 Request payload:', JSON.stringify(data, null, 2))
    }

    try {
      const url = `${this.baseUrl}/${endpoint}`
      if (import.meta.env.DEV) {
        console.info('🌐 Full URL:', url)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (import.meta.env.DEV) {
        console.info('📡 Response status:', response.status)
        console.info(
          '📡 Response headers:',
          Object.fromEntries(response.headers.entries())
        )
      }

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`

        try {
          const errorText = await response.text()
          if (import.meta.env.DEV) {
            console.error('🚨 Cloud Function Error Response:', errorText)
          }

          // Try to parse as JSON for better error details
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error || errorJson.message || errorMessage
          } catch {
            // If not JSON, use the text as is
            errorMessage = errorText || errorMessage
          }
        } catch (textError) {
          if (import.meta.env.DEV) {
            console.error('Failed to read error response:', textError)
          }
        }

        throw new Error(errorMessage)
      }

      const result = await response.json()
      if (import.meta.env.DEV) {
        console.info('✅ Response received:', result)
      }
      return result
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ Request failed:', error)
      }
      this.handleHttpError(error as ParsedError)
    }
  }

  private handleHttpError(error: ParsedError): never {
    if (
      error instanceof TypeError &&
      error.message.includes('Failed to fetch')
    ) {
      throw new Error(
        'Network error: Unable to connect to the server. Please check if the Firebase emulator is running.'
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('CORS')) {
        throw new Error(
          'CORS error: The server is not configured to accept requests from this origin.'
        )
      }

      if (error.message.includes('404')) {
        throw new Error(
          'Endpoint not found: The requested Cloud Function endpoint does not exist.'
        )
      }

      if (error.message.includes('500')) {
        throw new Error(
          'Server error: The Cloud Function encountered an internal error.'
        )
      }
    }

    // Re-throw the original error if we can't categorize it
    throw error
  }

  // Utility method to check if service is available
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeCloudFunctionRequest('health', {})
      return true
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Health check failed:', error)
      }
      return false
    }
  }

  // Method to update provider
  setProvider(provider: string): void {
    this.provider = provider
    if (import.meta.env.DEV) {
      // Provider updated (logged via logger)
    }
  }

  // Method to get current configuration
  getConfig(): { provider: string; baseUrl: string } {
    return {
      provider: this.provider,
      baseUrl: this.baseUrl,
    }
  }
}
