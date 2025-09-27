import type { ESPNRosterResponse, ESPNScoreboardResponse } from '../../types/'
import APIClient from './base/APIClient'
import type { INFLClient } from './base/interfaces'
import type { APIConfig, APIResponse } from './base/types'

const DEFAULT_ESPN_BASE_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

type PartialConfig = Partial<APIConfig>

function resolveConfig(input?: PartialConfig): APIConfig {
  const baseURL =
    input?.baseURL ??
    import.meta?.env?.VITE_ESPN_BASE_URL ??
    DEFAULT_ESPN_BASE_URL

  // Detect if we're on mobile - ESPN blocks User-Agent headers on mobile
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(input?.headers ?? {}),
  }

  // CRITICAL FIX: Don't add User-Agent header on mobile devices
  // ESPN's API blocks requests with User-Agent headers on mobile networks
  if (!isMobile) {
    headers['User-Agent'] = 'nfl-parlay-builder'
  }

  return {
    baseURL,
    headers,
    timeoutMs: input?.timeoutMs ?? 15000,
    retries: input?.retries ?? 1,
    retryDelayMs: input?.retryDelayMs ?? 300,
  }
}

export class ESPNClient extends APIClient implements INFLClient {
  constructor(config?: PartialConfig) {
    super(resolveConfig(config))
  }

  // Implement INFLClient interface methods

  async getCurrentWeekGames(): Promise<APIResponse<ESPNScoreboardResponse>> {
    try {
      return await this.get<ESPNScoreboardResponse>('/scoreboard')
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
      return await this.get<ESPNScoreboardResponse>('/scoreboard', {
        params: {
          seasontype: 2, // Regular season
          week,
          year: currentYear,
        },
      })
    } catch (error) {
      console.error(`Error fetching games for week ${week}:`, error)
      throw new Error(`Failed to fetch games for week ${week}`)
    }
  }

  async getTeamRoster(
    teamId: string
  ): Promise<APIResponse<ESPNRosterResponse>> {
    try {
      const endpoint = `/teams/${teamId}/roster`
      return await this.get<ESPNRosterResponse>(endpoint)
    } catch (error) {
      console.error(`Error fetching roster for team ${teamId}:`, error)
      throw new Error(`Failed to fetch roster for team ${teamId}`)
    }
  }

  async getCurrentWeek(): Promise<APIResponse<ESPNScoreboardResponse>> {
    try {
      return await this.get<ESPNScoreboardResponse>('/scoreboard')
    } catch (error) {
      console.error('Error fetching current week:', error)
      throw new Error('Failed to fetch current week')
    }
  }

  async getAvailableWeeks(): Promise<APIResponse<number[]>> {
    // ESPN doesn't provide this endpoint, so we return static data
    // This could be enhanced to dynamically determine based on season
    const weeks = Array.from({ length: 18 }, (_, i) => i + 1)

    return {
      data: weeks,
      status: 200,
      headers: {},
    }
  }
}

export default ESPNClient
