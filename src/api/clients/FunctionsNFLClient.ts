import {
  GeneratedParlay,
  NFLGame,
  NFLPlayer,
  ParlayOptions,
} from '../../shared'

// Base client for HTTP operations
class HttpBase {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const defaultHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    return response.json()
  }

  async getJson<T>(endpoint: string): Promise<T> {
    const response = await this.makeRequest<{ success: boolean; data: T }>(
      endpoint,
      { method: 'GET' }
    )

    if (!response.success) {
      throw new Error('Request failed')
    }

    return response.data
  }

  async postJson<T>(endpoint: string, data: any): Promise<T> {
    const response = await this.makeRequest<{ success: boolean; data: T }>(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )

    if (!response.success) {
      throw new Error('Request failed')
    }

    return response.data
  }
}

/**
 * Client for NFL-related Cloud Functions
 * Updated to use consistent gameId format throughout
 */
export class FunctionsNFLClient extends HttpBase {
  constructor() {
    // Determine the base URL based on environment
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
    if (!projectId) {
      throw new Error('VITE_FIREBASE_PROJECT_ID is required')
    }

    const isDev = import.meta.env.DEV
    const baseUrl = isDev
      ? `http://localhost:5001/${projectId}/us-central1`
      : `https://us-central1-${projectId}.cloudfunctions.net`

    super(baseUrl)
  }

  // ---------- Core NFL Data endpoints ----------

  currentWeek(): Promise<number> {
    return this.getJson<number>('/currentWeek')
  }

  availableWeeks(): Promise<number[]> {
    return this.getJson<number[]>('/availableWeeks')
  }

  gamesByWeek(week: number): Promise<NFLGame[]> {
    return this.getJson<NFLGame[]>(
      `/gamesByWeek?week=${encodeURIComponent(week)}`
    )
  }

  teamRoster(teamId: string): Promise<NFLPlayer[]> {
    return this.getJson<NFLPlayer[]>(
      `/teamRoster?teamId=${encodeURIComponent(teamId)}`
    )
  }

  getRateLimitStatus(): Promise<{
    remaining: number
    total: number
    resetTime: string
    currentCount: number
  }> {
    return this.getJson('/getRateLimitStatus')
  }

  // ---------- Parlay Generation (Updated to use gameId format) ----------

  /**
   * Generate parlay using gameId format
   * @param gameId - The game ID string
   * @param options - Optional parlay generation options
   */
  generateParlay(
    gameId: string,
    options?: ParlayOptions
  ): Promise<GeneratedParlay> {
    if (!gameId || typeof gameId !== 'string') {
      throw new Error('gameId is required and must be a string')
    }

    return this.postJson<GeneratedParlay>('/generateParlay', {
      gameId,
      options,
    })
  }

  /**
   * Generate parlay from game object (convenience method)
   * @param game - The NFLGame object
   * @param options - Optional parlay generation options
   */
  generateParlayFromGame(
    game: NFLGame,
    options?: ParlayOptions
  ): Promise<GeneratedParlay> {
    if (!game?.id) {
      throw new Error('Game object must have an id property')
    }

    return this.generateParlay(game.id, options)
  }

  // ---------- Legacy compatibility methods ----------

  /**
   * @deprecated Use gamesByWeek instead
   */
  nflGames(week: number): Promise<NFLGame[]> {
    return this.gamesByWeek(week)
  }

  async gameRosters(
    game: NFLGame
  ): Promise<{ homeRoster: NFLPlayer[]; awayRoster: NFLPlayer[] }> {
    const [homeRoster, awayRoster] = await Promise.all([
      this.teamRoster(game.homeTeam.id),
      this.teamRoster(game.awayTeam.id),
    ])
    return { homeRoster, awayRoster }
  }
}

export const functionsNFLClient = new FunctionsNFLClient()
