import { ENV, ESPN_CONFIG, NFL } from '../../constants'
import {
  APIConfig,
  APIResponse,
  ESPNRosterResponse,
  ESPNScoreboardResponse,
  INFLClient,
} from '../../types'
import APIClient from './base/APIClient'

type PartialConfig = Partial<APIConfig>

function resolveConfig(input?: PartialConfig): APIConfig {
  const baseURL = input?.baseURL ?? ENV.ESPN_BASE_URL ?? ESPN_CONFIG.baseURL

  if (!input?.baseURL && !ENV.ESPN_BASE_URL) {
    console.warn(
      'ESPNClient: using default ESPN base URL. Set VITE_ESPN_BASE_URL or pass a config to override.'
    )
  }

  // Detect if we're on mobile - ESPN blocks User-Agent headers on mobile
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )

  const headers: Record<string, string> = {
    ...ESPN_CONFIG.headers,
    ...(input?.headers ?? {}),
  }

  // CRITICAL FIX: Don't add User-Agent header on mobile devices
  // ESPN's API blocks requests with User-Agent headers on mobile networks
  if (!isMobile) {
    headers['User-Agent'] = ESPN_CONFIG.userAgent
  }

  return {
    baseURL,
    headers,
    timeoutMs: input?.timeoutMs ?? ESPN_CONFIG.timeout,
    retries: input?.retries ?? ESPN_CONFIG.retryAttempts,
    retryDelayMs: input?.retryDelayMs ?? ESPN_CONFIG.retryDelay,
  }
}

export class ESPNClient extends APIClient implements INFLClient {
  constructor(config?: PartialConfig) {
    super(resolveConfig(config))
  }

  // Implement INFLClient interface methods

  async getCurrentWeekGames(): Promise<APIResponse<ESPNScoreboardResponse>> {
    try {
      return await this.get<ESPNScoreboardResponse>(
        ESPN_CONFIG.endpoints.scoreboard
      )
    } catch (error) {
      console.error('Error fetching current week games:', error)
      throw new Error('Failed to fetch current week games')
    }
  }

  async getGamesByWeek(
    week: number
  ): Promise<APIResponse<ESPNScoreboardResponse>> {
    try {
      const currentYear = new Date().getFullYear()
      return await this.get<ESPNScoreboardResponse>(
        ESPN_CONFIG.endpoints.scoreboard,
        {
          params: {
            seasontype: 2, // Regular season
            week,
            year: currentYear,
          },
        }
      )
    } catch (error) {
      console.error(`Error fetching games for week ${week}:`, error)
      throw new Error(`Failed to fetch games for week ${week}`)
    }
  }

  async getTeamRoster(
    teamId: string
  ): Promise<APIResponse<ESPNRosterResponse>> {
    try {
      // Use the endpoint template from constants and replace placeholder
      const endpoint = ESPN_CONFIG.endpoints.roster.replace('{teamId}', teamId)
      return await this.get<ESPNRosterResponse>(endpoint)
    } catch (error) {
      console.error(`Error fetching roster for team ${teamId}:`, error)
      throw new Error(`Failed to fetch roster for team ${teamId}`)
    }
  }

  async getCurrentWeek(): Promise<APIResponse<ESPNScoreboardResponse>> {
    try {
      return await this.get<ESPNScoreboardResponse>(
        ESPN_CONFIG.endpoints.scoreboard
      )
    } catch (error) {
      console.error('Error fetching current week:', error)
      throw new Error('Failed to fetch current week')
    }
  }

  async getAvailableWeeks(): Promise<APIResponse<number[]>> {
    // ESPN doesn't provide this endpoint, so we return static data based on NFL constants
    // This could be enhanced to dynamically determine based on season
    const weeks = Array.from(
      { length: NFL.REGULAR_SEASON_WEEKS },
      (_, i) => i + 1
    )

    return {
      data: weeks,
      status: 200,
      headers: {},
    }
  }

  // Additional helper methods using constants

  /**
   * Get scoreboard for a specific season and week
   */
  async getScoreboard(
    week?: number,
    year?: number
  ): Promise<APIResponse<ESPNScoreboardResponse>> {
    try {
      const params: Record<string, string | number> = {}

      if (week !== undefined) {
        params.week = week
        params.seasontype = 2 // Regular season
      }

      if (year !== undefined) {
        params.year = year
      }

      return await this.get<ESPNScoreboardResponse>(
        ESPN_CONFIG.endpoints.scoreboard,
        { params }
      )
    } catch (error) {
      console.error('Error fetching scoreboard:', error)
      throw new Error('Failed to fetch scoreboard')
    }
  }

  /**
   * Validate week number against NFL constants
   */
  private isValidWeek(week: number): boolean {
    return week >= 1 && week <= NFL.REGULAR_SEASON_WEEKS
  }

  /**
   * Get games for multiple weeks (useful for preloading)
   */
  async getGamesForWeeks(
    weeks: number[]
  ): Promise<APIResponse<ESPNScoreboardResponse>[]> {
    const validWeeks = weeks.filter(week => this.isValidWeek(week))

    if (validWeeks.length !== weeks.length) {
      console.warn(
        `Some weeks were invalid. Valid range: 1-${NFL.REGULAR_SEASON_WEEKS}`
      )
    }

    try {
      const promises = validWeeks.map(week => this.getGamesByWeek(week))
      return await Promise.all(promises)
    } catch (error) {
      console.error('Error fetching games for multiple weeks:', error)
      throw new Error('Failed to fetch games for multiple weeks')
    }
  }
}

export default ESPNClient
