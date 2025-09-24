import type { GameRosters, NFLGame, NFLPlayer } from '../types'
import { container } from './container'

/**
 * NFL Data Service (thin proxy)
 * Backwards-compatible façade over the Cloud Functions data endpoints.
 * This replaces the old browser-side ESPN aggregation and should be removed
 * once all callers use `container.nflData` directly.
 */
export class NFLDataService {
  /**
   * Get current week NFL games
   */
  async getCurrentWeekGames(): Promise<NFLGame[]> {
    // No week provided -> server returns current-week games
    return container.nflData.nflGames()
  }

  /**
   * Get games for a specific week
   */
  async getGamesByWeek(week: number): Promise<NFLGame[]> {
    return container.nflData.nflGames(week)
  }

  /**
   * Get current NFL week number
   */
  async getCurrentWeek(): Promise<number> {
    return container.nflData.currentWeek()
  }

  /**
   * Get available weeks for the current season.
   * If the backend doesn't provide an array yet, synthesize [current..18].
   */
  async getAvailableWeeks(): Promise<number[]> {
    try {
      // Prefer a backend-provided list if you add it later:
      // return await container.nflData.availableWeeks()
      const current = await container.nflData.currentWeek()
      const start = Math.min(Math.max(current, 1), 18)
      return Array.from({ length: 18 - start + 1 }, (_, i) => start + i)
    } catch {
      // Fallback to full season
      return Array.from({ length: 18 }, (_, i) => i + 1)
    }
  }

  /**
   * Get team roster
   */
  async getTeamRoster(teamId: string): Promise<NFLPlayer[]> {
    return container.nflData.teamRoster(teamId)
  }

  /**
   * Get rosters for both teams in a game
   * Calls server and ensures legacy aliases are present.
   */
  async getGameRosters(game: NFLGame): Promise<GameRosters> {
    const r = await container.nflData.gameRosters(game.id)
    // Ensure legacy aliases are available to UI (homeRoster/awayRoster)
    return {
      gameId: r.gameId ?? game.id,
      home: r.home,
      away: r.away,
      homeRoster: (r as any).homeRoster ?? r.home,
      awayRoster: (r as any).awayRoster ?? r.away,
    } as GameRosters
  }

  /**
   * Get team with roster (combines team info + roster)
   */
  async getTeamWithRoster(
    teamId: string
  ): Promise<{ team: { id: string }; roster: NFLPlayer[] }> {
    const roster = await this.getTeamRoster(teamId)
    return { team: { id: teamId }, roster }
  }
}
