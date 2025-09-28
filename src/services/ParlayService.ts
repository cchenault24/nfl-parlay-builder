export interface ParlayPreferences {
  game: {
    homeTeam: string
    awayTeam: string
    gameTime: string
    venue: string
  }
  rosters: {
    homeRoster: Player[]
    awayRoster: Player[]
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

interface Player {
  id: string
  name: string
  position: string
  team: string
  injuryStatus?: string
}

interface ParlayResult {
  legs: ParlayLeg[]
  totalOdds: number
  potentialPayout: number
  confidence: number
  reasoning: string
}

interface ParlayLeg {
  type: string
  player?: string
  team?: string
  market: string
  selection: string
  odds: number
  reasoning: string
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
  ): Promise<ParlayResult> {
    console.log('🎯 Generating parlay with provider:', this.provider)

    // Extract gameId from preferences first
    const { gameId, ...preferencesWithoutGameId } = preferences

    // Validate preferences (without gameId)
    this.validatePreferences(preferencesWithoutGameId)

    // Make the request with gameId and game data as expected by Cloud Function
    const requestPayload = {
      gameId: gameId,
      game: preferences.game, // Include the complete game data
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

  async getGameData(gameId: string): Promise<any> {
    console.log('📊 Fetching game data for:', gameId)
    return this.makeCloudFunctionRequest('getGameData', { gameId })
  }

  async getPlayerStats(playerId: string): Promise<any> {
    console.log('👤 Fetching player stats for:', playerId)
    return this.makeCloudFunctionRequest('getPlayerStats', { playerId })
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
    data: any
  ): Promise<any> {
    console.log('🔍 Request endpoint:', endpoint)
    console.log('🔍 Request payload:', JSON.stringify(data, null, 2))

    try {
      const url = `${this.baseUrl}/${endpoint}`
      console.log('🌐 Full URL:', url)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
      })

      console.log('📡 Response status:', response.status)
      console.log(
        '📡 Response headers:',
        Object.fromEntries(response.headers.entries())
      )

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`

        try {
          const errorText = await response.text()
          console.error('🚨 Cloud Function Error Response:', errorText)

          // Try to parse as JSON for better error details
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error || errorJson.message || errorMessage
          } catch {
            // If not JSON, use the text as is
            errorMessage = errorText || errorMessage
          }
        } catch (textError) {
          console.error('Failed to read error response:', textError)
        }

        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('✅ Response received:', result)
      return result
    } catch (error) {
      console.error('❌ Request failed:', error)
      this.handleHttpError(error)
    }
  }

  private handleHttpError(error: any): never {
    if (
      error instanceof TypeError &&
      error.message.includes('Failed to fetch')
    ) {
      throw new Error(
        'Network error: Unable to connect to the server. Please check if the Firebase emulator is running.'
      )
    }

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

    // Re-throw the original error if we can't categorize it
    throw error
  }

  // Utility method to check if service is available
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeCloudFunctionRequest('health', {})
      return true
    } catch (error) {
      console.warn('Health check failed:', error)
      return false
    }
  }

  // Method to update provider
  setProvider(provider: string): void {
    this.provider = provider
    console.log('🔄 Provider updated to:', provider)
  }

  // Method to get current configuration
  getConfig(): { provider: string; baseUrl: string } {
    return {
      provider: this.provider,
      baseUrl: this.baseUrl,
    }
  }
}
