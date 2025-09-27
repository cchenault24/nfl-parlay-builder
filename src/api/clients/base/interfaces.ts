import { ESPNRosterResponse, ESPNScoreboardResponse } from '../../../types'
import { APIResponse } from './types'

/**
 * NFL-specific client interface
 */
export interface INFLClient {
  /**
   * Get current NFL week games
   */
  getCurrentWeekGames(): Promise<APIResponse<ESPNScoreboardResponse>>

  /**
   * Get games for a specific week
   */
  getGamesByWeek(week: number): Promise<APIResponse<ESPNScoreboardResponse>>

  /**
   * Get team roster
   */
  getTeamRoster(teamId: string): Promise<APIResponse<ESPNRosterResponse>>

  /**
   * Get current NFL week number
   */
  getCurrentWeek(): Promise<APIResponse<ESPNScoreboardResponse>>

  /**
   * Get available weeks for current season
   */
  getAvailableWeeks(): Promise<APIResponse<number[]>>
}
