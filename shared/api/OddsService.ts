import { sharedRuntime } from '../runtime'
import type { WeekOdds } from '../types'

// Public, like /season and /games: which books have posted which lines is not
// per-user information, and the game-detail screen needs it before the user has
// spent anything.
export class OddsService {
  async getWeekOdds(week: number): Promise<WeekOdds> {
    const res = await fetch(`${sharedRuntime().baseURL}/odds/week/${week}`)
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null
      throw new Error(body?.message ?? `Request failed (${res.status})`)
    }
    return res.json() as Promise<WeekOdds>
  }
}
