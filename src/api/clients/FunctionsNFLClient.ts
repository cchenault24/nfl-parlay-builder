// src/api/clients/FunctionsNFLClient.ts - Updated for v2 Functions
import type {
  GeneratedParlay,
  NFLGame,
  NFLPlayer,
  ParlayOptions,
} from '../../types'

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID
if (!PROJECT_ID) {
  throw new Error('VITE_FIREBASE_PROJECT_ID is required')
}

const BASE =
  import.meta.env.VITE_CLOUD_FUNCTION_URL ||
  (import.meta.env.DEV
    ? `http://localhost:5001/${PROJECT_ID}/us-central1`
    : `https://us-central1-${PROJECT_ID}.cloudfunctions.net`)

export class FunctionsNFLClient {
  constructor(private readonly baseUrl: string = BASE) {
    console.log('🔧 FunctionsNFLClient initialized with:', this.baseUrl)
  }

  // ---------- low-level helpers ----------
  private async getJson<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`
    console.log('🔧 Making GET request to:', url)

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'omit',
    })

    console.log('🔧 Response status:', res.status, res.statusText)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('🚨 Request failed:', {
        url,
        status: res.status,
        statusText: res.statusText,
        body: text,
      })
      throw new Error(
        `GET ${path} failed ${res.status} ${res.statusText} ${text}`
      )
    }

    const data = await res.json()
    console.log('🔧 Response data:', data)

    // Handle Firebase Functions v2 response format
    if (data.success === false) {
      throw new Error(data.error || 'Request failed')
    }

    // Return the data field for successful responses
    return data.data ?? data
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    console.log('🔧 Making POST request to:', url, 'with body:', body)

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'omit',
      body: JSON.stringify(body),
    })

    console.log('🔧 Response status:', res.status, res.statusText)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('🚨 Request failed:', {
        url,
        status: res.status,
        statusText: res.statusText,
        body: text,
      })
      throw new Error(
        `POST ${path} failed ${res.status} ${res.statusText} ${text}`
      )
    }

    const data = await res.json()
    console.log('🔧 Response data:', data)

    // Handle Firebase Functions v2 response format
    if (data.success === false) {
      throw new Error(data.error || 'Request failed')
    }

    // Return the data field for successful responses
    return data.data ?? data
  }

  // ---------- endpoints you actually call ----------
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

  generateParlay(input: {
    game: NFLGame
    options?: ParlayOptions
  }): Promise<GeneratedParlay> {
    return this.postJson<GeneratedParlay>('/generateParlay', input)
  }

  // ---------- compatibility shims for legacy callers ----------
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
