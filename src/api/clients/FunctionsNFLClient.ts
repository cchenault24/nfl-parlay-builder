// src/api/clients/FunctionsNFLClient.ts
import type {
  GeneratedParlay,
  NFLGame,
  NFLPlayer,
  ParlayOptions,
} from '../../types' // adjust if your types barrel is elsewhere

// If your project puts shared types at '@npb/shared', swap the import:
// import type { NFLGame, NFLPlayer, GeneratedParlay, ParlayOptions } from '@npb/shared'

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
  constructor(private readonly baseUrl: string = BASE) {}

  // ---------- low-level helpers ----------
  private async getJson<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(
        `GET ${path} failed ${res.status} ${res.statusText} ${text}`
      )
    }
    return res.json() as Promise<T>
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(
        `POST ${path} failed ${res.status} ${res.statusText} ${text}`
      )
    }
    return res.json() as Promise<T>
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

  generateParlay(input: {
    game: NFLGame
    options?: ParlayOptions
  }): Promise<GeneratedParlay> {
    // server composes context — only needs game + options
    return this.postJson<GeneratedParlay>('/generateParlay', input)
  }

  // ---------- compatibility shims for legacy callers ----------
  // old name used in NFLDataService or hooks
  nflGames(week: number): Promise<NFLGame[]> {
    return this.gamesByWeek(week)
  }

  // some old code expects "gameRosters(game)" on the client
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
