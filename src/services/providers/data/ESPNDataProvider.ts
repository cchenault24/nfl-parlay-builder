// ================================================================================================
// ESPN DATA PROVIDER - ESPN implementation of IDataProvider interface
// ================================================================================================

import {
  InjuryReport,
  PlayerStats,
  TeamStats,
  WeatherData,
} from '../../../types/api/player'
import { APIResponse } from '../../../types/core/api'
import {
  ESPNRosterResponse,
  ESPNScoreboardResponse,
} from '../../../types/external'
import {
  DataProviderConfig,
  DataProviderMetadata,
  DataProviderResponse,
  DataQueryOptions,
  IDataProvider,
  ProviderHealth,
} from '../../../types/providers'

/**
 * ESPN data provider implementation
 */
export class ESPNDataProvider implements IDataProvider {
  public readonly metadata: DataProviderMetadata
  public readonly config: DataProviderConfig
  private health: ProviderHealth
  private initialized: boolean = false
  private baseURL: string

  constructor(config: DataProviderConfig) {
    this.config = {
      ...config,
      name: config.name || 'espn',
      enabled: config.enabled !== undefined ? config.enabled : true,
      priority: config.priority || 1,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      baseURL:
        config.baseURL ||
        'https://site.api.espn.com/apis/site/v2/sports/football/nfl',
    }

    this.baseURL = this.config.baseURL

    this.metadata = {
      name: 'ESPN Data Provider',
      version: '1.0.0',
      type: 'data',
      capabilities: [
        'nfl_games',
        'team_rosters',
        'player_stats',
        'injury_reports',
        'weather_data',
      ],
      supportedEndpoints: [
        '/scoreboard',
        '/teams/{teamId}/roster',
        '/players/{playerId}/stats',
        '/teams/{teamId}/injuries',
      ],
      dataQuality: 'high',
      updateFrequency: 'real-time',
      costPerRequest: 0, // Free API
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
      },
    }

    this.health = {
      name: this.config.name,
      healthy: false,
      lastChecked: new Date(),
      uptime: 0,
    }
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Test connection by making a simple request
      await this.makeRequest('/scoreboard')
      this.initialized = true
      this.updateHealth(true)
    } catch (error) {
      this.updateHealth(
        false,
        undefined,
        error instanceof Error ? error.message : 'Initialization failed'
      )
      throw error
    }
  }

  /**
   * Validate provider connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/scoreboard')
      return true
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('ESPN connection validation failed:', error)
      }
      return false
    }
  }

  /**
   * Get current provider health status
   */
  getHealth(): ProviderHealth {
    return { ...this.health }
  }

  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<DataProviderConfig>): void {
    Object.assign(this.config, config)
    if (config.baseURL) {
      this.baseURL = config.baseURL
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    this.initialized = false
    this.updateHealth(false)
  }

  /**
   * Get current week games
   */
  async getCurrentWeekGames(
    options: DataQueryOptions = {}
  ): Promise<DataProviderResponse<ESPNScoreboardResponse>> {
    const response = await this.makeRequest<ESPNScoreboardResponse>(
      '/scoreboard',
      options
    )
    return this.wrapResponse(response, false)
  }

  /**
   * Get games for a specific week
   */
  async getGamesByWeek(
    week: number,
    options: DataQueryOptions = {}
  ): Promise<DataProviderResponse<ESPNScoreboardResponse>> {
    const currentYear = new Date().getFullYear()
    const response = await this.makeRequest<ESPNScoreboardResponse>(
      '/scoreboard',
      {
        ...options,
        params: {
          seasontype: 2, // Regular season
          week,
          year: currentYear,
          ...options.params,
        },
      }
    )
    return this.wrapResponse(response, false)
  }

  /**
   * Get team roster
   */
  async getTeamRoster(
    teamId: string,
    options: DataQueryOptions = {}
  ): Promise<DataProviderResponse<ESPNRosterResponse>> {
    const response = await this.makeRequest<ESPNRosterResponse>(
      `/teams/${teamId}/roster`,
      options
    )
    return this.wrapResponse(response, false)
  }

  /**
   * Get current NFL week number
   */
  async getCurrentWeek(
    _options: DataQueryOptions = {}
  ): Promise<DataProviderResponse<ESPNScoreboardResponse>> {
    const response =
      await this.makeRequest<ESPNScoreboardResponse>('/scoreboard')
    return this.wrapResponse(response, false)
  }

  /**
   * Get available weeks for current season
   */
  async getAvailableWeeks(
    _options: DataQueryOptions = {}
  ): Promise<DataProviderResponse<number[]>> {
    // ESPN doesn't provide this endpoint, so we return static data
    const weeks = Array.from({ length: 18 }, (_, i) => i + 1)

    const response: APIResponse<number[]> = {
      data: weeks,
      status: 200,
      headers: {},
    }

    return this.wrapResponse(response, true) // Mark as cached since it's static
  }

  /**
   * Get player statistics
   */
  async getPlayerStats(
    playerId: string,
    season?: number,
    options: DataQueryOptions = {}
  ): Promise<DataProviderResponse<PlayerStats>> {
    const endpoint = `/players/${playerId}/stats`
    const params = season ? { season } : {}

    const response = await this.makeRequest<Record<string, unknown>>(endpoint, {
      ...options,
      params: { ...params, ...options.params },
    })

    // Transform the response to PlayerStats format
    const playerStats: PlayerStats = {
      playerId,
      season: season || new Date().getFullYear(),
      ...response.data,
    }

    return this.wrapResponse({ data: playerStats, status: 200 }, false)
  }

  /**
   * Get team statistics
   */
  async getTeamStats(
    teamId: string,
    season?: number,
    options: DataQueryOptions = {}
  ): Promise<DataProviderResponse<TeamStats>> {
    const endpoint = `/teams/${teamId}/stats`
    const params = season ? { season } : {}

    const response = await this.makeRequest<Record<string, unknown>>(endpoint, {
      ...options,
      params: { ...params, ...options.params },
    })

    // Transform the response to TeamStats format
    const teamStats: TeamStats = {
      teamId,
      season: season || new Date().getFullYear(),
      ...response.data,
    }

    return this.wrapResponse({ data: teamStats, status: 200 }, false)
  }

  /**
   * Get injury reports
   */
  async getInjuryReports(
    teamId?: string,
    options: DataQueryOptions = {}
  ): Promise<DataProviderResponse<InjuryReport[]>> {
    const endpoint = teamId ? `/teams/${teamId}/injuries` : '/injuries'

    const response = await this.makeRequest<Record<string, unknown>>(
      endpoint,
      options
    )

    // Transform the response to InjuryReport[] format
    const injuryData = response.data as { injuries?: InjuryReport[] }
    const injuryReports: InjuryReport[] = injuryData?.injuries || []

    return this.wrapResponse({ data: injuryReports, status: 200 }, false)
  }

  /**
   * Get weather data for a game
   */
  async getWeatherData(
    gameId: string,
    options: DataQueryOptions = {}
  ): Promise<DataProviderResponse<WeatherData>> {
    const response = await this.makeRequest<Record<string, unknown>>(
      `/games/${gameId}/weather`,
      options
    )

    // Transform the response to WeatherData format
    const weatherData: WeatherData = {
      gameId,
      ...response.data,
    }

    return this.wrapResponse({ data: weatherData, status: 200 }, false)
  }

  // ===== PRIVATE METHODS =====

  /**
   * Update health status
   */
  private updateHealth(
    healthy: boolean,
    responseTime?: number,
    error?: string
  ): void {
    this.health = {
      ...this.health,
      healthy,
      lastChecked: new Date(),
      responseTime,
      lastError: error,
      uptime: healthy ? this.health.uptime + 1 : this.health.uptime,
    }
  }

  /**
   * Make HTTP request to ESPN API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: DataQueryOptions = {}
  ): Promise<APIResponse<T>> {
    const url = new URL(endpoint, this.baseURL)

    // Add query parameters
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    // Prepare headers
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.getDefaultHeaders(),
      ...options.headers,
    }

    // Create request options
    const requestOptions: RequestInit = {
      method: 'GET',
      headers,
      signal: options.signal,
    }

    // Add timeout
    if (options.timeout || this.config.timeout) {
      const controller = new AbortController()
      const timeout = setTimeout(
        () => controller.abort(),
        options.timeout || this.config.timeout
      )

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          clearTimeout(timeout)
          controller.abort()
        })
      }

      requestOptions.signal = controller.signal
    }

    try {
      const response = await fetch(url.toString(), requestOptions)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        data,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `Request timeout after ${options.timeout || this.config.timeout}ms`
        )
      }
      throw error
    }
  }

  /**
   * Get default headers for ESPN API
   */
  private getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    }

    // Don't add User-Agent on mobile devices (ESPN blocks it)
    if (typeof navigator !== 'undefined') {
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )

      if (!isMobile) {
        headers['User-Agent'] = 'nfl-parlay-builder'
      }
    }

    return headers
  }

  /**
   * Wrap API response with provider metadata
   */
  private wrapResponse<T>(
    response: APIResponse<T>,
    cached: boolean
  ): DataProviderResponse<T> {
    return {
      ...response,
      provider: this.config.name,
      cached,
      timestamp: new Date(),
      cost: 0, // ESPN API is free
    }
  }
}

export default ESPNDataProvider
