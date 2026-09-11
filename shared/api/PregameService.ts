import { sharedRuntime } from '../runtime'
import type { GameTeamStats, WeekOdds } from '../types'

// The two reads the game-detail screen needs *before* a run: which books have
// posted which lines, and both teams' season stats. Public, like /season and
// /games — neither is per-user information, and both have to be free, because
// deciding which game to spend a generation on is the whole point of that
// screen.
export class PregameService {
  getWeekOdds(week: number): Promise<WeekOdds> {
    return this.get<WeekOdds>(`/odds/week/${week}`)
  }

  getGameStats(gameId: string): Promise<GameTeamStats> {
    return this.get<GameTeamStats>(`/games/${gameId}/stats`)
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${sharedRuntime().baseURL}${path}`)
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null
      throw new Error(body?.message ?? `Request failed (${res.status})`)
    }
    return res.json() as Promise<T>
  }
}
