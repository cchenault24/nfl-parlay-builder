import { APIResponse } from './types'

/**
 * NFL-specific client interface
 */
export interface INFLClient {
  /**
   * Get current NFL week games
   */
  getCurrentWeekGames(): Promise<APIResponse<any>>

  /**
   * Get games for a specific week
   */
  getGamesByWeek(week: number): Promise<APIResponse<any>>

  /**
   * Get team roster
   */
  getTeamRoster(teamId: string): Promise<APIResponse<any>>

  /**
   * Get current NFL week number
   */
  getCurrentWeek(): Promise<APIResponse<any>>

  /**
   * Get available weeks for current season
   */
  getAvailableWeeks(): Promise<APIResponse<number[]>>
}
