import type {
  GameRosters,
  GenerateParlayRequest,
  GenerateParlayResponse,
  NFLGame,
  NFLPlayer,
} from '@npb/shared'

const FUNCTIONS_BASE_URL =
  (import.meta as any)?.env?.VITE_FUNCTIONS_BASE_URL?.replace(/\/+$/, '') ||
  (typeof window !== 'undefined' &&
    (window as any)?.__APP_CONFIG__?.FUNCTIONS_BASE_URL?.replace(/\/+$/, '')) ||
  'http://localhost:5001/nfl-parlay-builder/us-central1'

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GET ${url} -> ${res.status} ${text}`)
  }
  return (await res.json()) as T
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`POST ${url} -> ${res.status} ${text}`)
  }
  return (await res.json()) as T
}

export class FunctionsNFLClient {
  constructor(private baseUrl = FUNCTIONS_BASE_URL) {}

  // ---- Orchestrator ----
  async generateParlay(
    req: GenerateParlayRequest
  ): Promise<GenerateParlayResponse> {
    return postJson<GenerateParlayResponse>(
      `${this.baseUrl}/generateParlay`,
      req
    )
  }

  // ---- Data proxy endpoints (to be implemented server-side) ----
  async teamRoster(teamId: string): Promise<NFLPlayer[]> {
    return getJson<NFLPlayer[]>(
      `${this.baseUrl}/teamRoster?teamId=${encodeURIComponent(teamId)}`
    )
  }

  async currentWeek(): Promise<number> {
    return getJson<number>(`${this.baseUrl}/currentWeek`)
  }

  async availableWeek(): Promise<number> {
    return getJson<number>(`${this.baseUrl}/availableWeek`)
  }

  async gameRosters(gameId: string): Promise<GameRosters> {
    return getJson<GameRosters>(
      `${this.baseUrl}/gameRosters?gameId=${encodeURIComponent(gameId)}`
    )
  }

  async nflGames(week?: number): Promise<NFLGame[]> {
    const url =
      week != null
        ? `${this.baseUrl}/nflGames?week=${encodeURIComponent(String(week))}`
        : `${this.baseUrl}/nflGames`
    return getJson<NFLGame[]>(url)
  }
}
