// ================================================================================================
// MOCK DATA PROVIDER - Mock implementation of IDataProvider interface for testing
// ================================================================================================

import { APIResponse } from '../../../types/core/api'
import {
  ESPNAthlete,
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
 * Mock data provider configuration
 */
export interface MockDataProviderConfig extends DataProviderConfig {
  enableErrorSimulation?: boolean
  errorRate?: number
  debugMode?: boolean
  responseDelay?: number
}

/**
 * Mock data provider implementation for testing and development
 */
export class MockDataProvider implements IDataProvider {
  public readonly metadata: DataProviderMetadata
  public readonly config: MockDataProviderConfig
  private health: ProviderHealth
  private initialized: boolean = false
  private errorCount: number = 0
  private requestCount: number = 0

  constructor(config: MockDataProviderConfig) {
    this.config = {
      ...config,
      name: config.name || 'mock-data',
      enabled: config.enabled !== undefined ? config.enabled : true,
      priority: config.priority || 1,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      baseURL: config.baseURL || 'http://localhost:3000/mock',
      enableErrorSimulation: config.enableErrorSimulation || false,
      errorRate: config.errorRate || 0.1,
      debugMode: config.debugMode || false,
      responseDelay: config.responseDelay || 500,
    }

    this.metadata = {
      name: 'Mock Data Provider',
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
      dataQuality: 'medium',
      updateFrequency: 'daily',
      costPerRequest: 0, // Free for testing
      rateLimit: {
        requestsPerMinute: 1000,
        requestsPerHour: 10000,
      },
    }

    this.health = {
      name: this.config.name,
      healthy: true,
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

    // Simulate initialization delay
    await this.delay(100)

    this.initialized = true
    this.updateHealth(true)

    if (this.config.debugMode) {
      if (import.meta.env.DEV) {
        console.debug('Mock Data Provider initialized successfully')
      }
    }
  }

  /**
   * Validate provider connection
   */
  async validateConnection(): Promise<boolean> {
    // Simulate connection validation
    await this.delay(50)

    if (
      this.config.enableErrorSimulation &&
      Math.random() < this.config.errorRate!
    ) {
      return false
    }

    return true
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
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    this.initialized = false
    this.updateHealth(false)

    if (this.config.debugMode) {
      if (import.meta.env.DEV) {
        console.debug('Mock Data Provider disposed')
      }
    }
  }

  /**
   * Get current week games
   */
  async getCurrentWeekGames(
    options: DataQueryOptions = {}
  ): Promise<DataProviderResponse<ESPNScoreboardResponse>> {
    const response = await this.simulateRequest<ESPNScoreboardResponse>(
      () => this.generateMockScoreboard(1),
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
    const response = await this.simulateRequest<ESPNScoreboardResponse>(
      () => this.generateMockScoreboard(week),
      options
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
    const response = await this.simulateRequest<ESPNRosterResponse>(
      () => this.generateMockRoster(teamId),
      options
    )
    return this.wrapResponse(response, false)
  }

  /**
   * Get current NFL week number
   */
  async getCurrentWeek(
    options: DataQueryOptions = {}
  ): Promise<DataProviderResponse<ESPNScoreboardResponse>> {
    const response = await this.simulateRequest<ESPNScoreboardResponse>(
      () => this.generateMockScoreboard(1),
      options
    )
    return this.wrapResponse(response, false)
  }

  /**
   * Get available weeks for current season
   */
  async getAvailableWeeks(
    _options: DataQueryOptions = {}
  ): Promise<DataProviderResponse<number[]>> {
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
  ): Promise<DataProviderResponse<any>> {
    const response = await this.simulateRequest<any>(
      () => this.generateMockPlayerStats(playerId, season),
      options
    )
    return this.wrapResponse(response, false)
  }

  /**
   * Get team statistics
   */
  async getTeamStats(
    teamId: string,
    season?: number,
    options: DataQueryOptions = {}
  ): Promise<DataProviderResponse<any>> {
    const response = await this.simulateRequest<any>(
      () => this.generateMockTeamStats(teamId, season),
      options
    )
    return this.wrapResponse(response, false)
  }

  /**
   * Get injury reports
   */
  async getInjuryReports(
    teamId?: string,
    options: DataQueryOptions = {}
  ): Promise<DataProviderResponse<any>> {
    const response = await this.simulateRequest<any>(
      () => this.generateMockInjuryReports(teamId),
      options
    )
    return this.wrapResponse(response, false)
  }

  /**
   * Get weather data for a game
   */
  async getWeatherData(
    gameId: string,
    options: DataQueryOptions = {}
  ): Promise<DataProviderResponse<any>> {
    const response = await this.simulateRequest<any>(
      () => this.generateMockWeatherData(gameId),
      options
    )
    return this.wrapResponse(response, false)
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
   * Simulate API request with delay and error handling
   */
  private async simulateRequest<T>(
    dataGenerator: () => T,
    _options: DataQueryOptions = {}
  ): Promise<APIResponse<T>> {
    this.requestCount++

    // Simulate response delay
    await this.delay(this.config.responseDelay!)

    // Simulate error if enabled
    if (
      this.config.enableErrorSimulation &&
      Math.random() < this.config.errorRate!
    ) {
      this.errorCount++
      throw new Error(`Mock error simulation (error #${this.errorCount})`)
    }

    const data = dataGenerator()
    const responseTime = Date.now()

    this.updateHealth(true, responseTime)

    if (this.config.debugMode && import.meta.env.DEV) {
      // Mock Data Provider generated response (logged via logger)
    }

    return {
      data,
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-mock-provider': 'true',
      },
    }
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
      cost: 0, // Free for testing
    }
  }

  /**
   * Generate mock scoreboard data
   */
  private generateMockScoreboard(week: number): ESPNScoreboardResponse {
    const teams = [
      { id: '1', name: 'Chiefs', abbreviation: 'KC' },
      { id: '2', name: 'Bills', abbreviation: 'BUF' },
      { id: '3', name: 'Dolphins', abbreviation: 'MIA' },
      { id: '4', name: 'Patriots', abbreviation: 'NE' },
      { id: '5', name: 'Cowboys', abbreviation: 'DAL' },
      { id: '6', name: 'Eagles', abbreviation: 'PHI' },
    ]

    const events = []
    for (let i = 0; i < 6; i += 2) {
      const homeTeam = teams[i]
      const awayTeam = teams[i + 1]

      events.push({
        id: `game-${i / 2 + 1}`,
        name: `${awayTeam.name} @ ${homeTeam.name}`,
        shortName: `${awayTeam.abbreviation} @ ${homeTeam.abbreviation}`,
        date: new Date(
          Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        competitions: [
          {
            id: `comp-${i / 2 + 1}`,
            competitors: [
              {
                id: awayTeam.id,
                homeAway: 'away' as const,
                team: {
                  id: awayTeam.id,
                  name: awayTeam.name,
                  displayName: awayTeam.name,
                  abbreviation: awayTeam.abbreviation,
                  logo: `https://a.espncdn.com/i/teamlogos/nfl/500/${awayTeam.abbreviation.toLowerCase()}.png`,
                },
              },
              {
                id: homeTeam.id,
                homeAway: 'home' as const,
                team: {
                  id: homeTeam.id,
                  name: homeTeam.name,
                  displayName: homeTeam.name,
                  abbreviation: homeTeam.abbreviation,
                  logo: `https://a.espncdn.com/i/teamlogos/nfl/500/${homeTeam.abbreviation.toLowerCase()}.png`,
                },
              },
            ],
          },
        ],
      })
    }

    return {
      season: {
        year: new Date().getFullYear(),
      },
      week: {
        number: week,
      },
      events,
    }
  }

  /**
   * Generate mock roster data
   */
  private generateMockRoster(teamId: string): ESPNRosterResponse {
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
    const athletes: ESPNAthlete[] = []

    positions.forEach((pos, posIndex) => {
      const count = pos === 'WR' ? 6 : pos === 'RB' ? 3 : 2

      for (let i = 0; i < count; i++) {
        athletes.push({
          id: `player-${teamId}-${posIndex}-${i}`,
          displayName: `Player ${i + 1}`,
          fullName: `Player ${i + 1} LastName`,
          position: {
            abbreviation: pos,
            name: this.getPositionName(pos),
          },
          jersey: String(Math.floor(Math.random() * 99) + 1),
          experience: {
            years: Math.floor(Math.random() * 10),
          },
          college: {
            name: `University ${i + 1}`,
          },
        })
      }
    })

    return {
      athletes: [
        {
          items: athletes,
        },
      ],
    }
  }

  /**
   * Generate mock player stats
   */
  private generateMockPlayerStats(playerId: string, season?: number): any {
    return {
      playerId,
      season: season || new Date().getFullYear(),
      stats: {
        passing: {
          yards: Math.floor(Math.random() * 4000) + 2000,
          touchdowns: Math.floor(Math.random() * 30) + 10,
          interceptions: Math.floor(Math.random() * 15),
        },
        rushing: {
          yards: Math.floor(Math.random() * 1000) + 200,
          touchdowns: Math.floor(Math.random() * 10) + 2,
        },
        receiving: {
          yards: Math.floor(Math.random() * 1200) + 300,
          touchdowns: Math.floor(Math.random() * 8) + 2,
          receptions: Math.floor(Math.random() * 80) + 20,
        },
      },
    }
  }

  /**
   * Generate mock team stats
   */
  private generateMockTeamStats(teamId: string, season?: number): any {
    return {
      teamId,
      season: season || new Date().getFullYear(),
      stats: {
        offense: {
          pointsPerGame: Math.floor(Math.random() * 15) + 20,
          yardsPerGame: Math.floor(Math.random() * 100) + 300,
          turnovers: Math.floor(Math.random() * 20) + 10,
        },
        defense: {
          pointsAllowedPerGame: Math.floor(Math.random() * 15) + 15,
          yardsAllowedPerGame: Math.floor(Math.random() * 100) + 250,
          takeaways: Math.floor(Math.random() * 25) + 10,
        },
      },
    }
  }

  /**
   * Generate mock injury reports
   */
  private generateMockInjuryReports(teamId?: string): any {
    const injuries = []
    const injuryTypes = ['Ankle', 'Knee', 'Shoulder', 'Hamstring', 'Concussion']
    const statuses = ['out', 'doubtful', 'questionable', 'probable']

    for (let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) {
      injuries.push({
        playerId: `player-${i + 1}`,
        playerName: `Player ${i + 1}`,
        position: ['QB', 'RB', 'WR', 'TE', 'K'][Math.floor(Math.random() * 5)],
        injuryType: injuryTypes[Math.floor(Math.random() * injuryTypes.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        bodyPart: injuryTypes[Math.floor(Math.random() * injuryTypes.length)],
      })
    }

    return {
      teamId: teamId || 'unknown',
      injuries,
      lastUpdated: new Date().toISOString(),
    }
  }

  /**
   * Generate mock weather data
   */
  private generateMockWeatherData(gameId: string): any {
    const conditions = ['clear', 'rain', 'snow', 'wind', 'fog']
    const condition = conditions[Math.floor(Math.random() * conditions.length)]

    return {
      gameId,
      condition,
      temperature: Math.floor(Math.random() * 60) + 20, // 20-80°F
      windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 mph
      humidity: Math.floor(Math.random() * 40) + 30, // 30-70%
      precipitation:
        condition === 'rain' || condition === 'snow'
          ? Math.floor(Math.random() * 10) + 1
          : 0,
    }
  }

  /**
   * Get position name from abbreviation
   */
  private getPositionName(abbreviation: string): string {
    const positionMap: Record<string, string> = {
      QB: 'Quarterback',
      RB: 'Running Back',
      WR: 'Wide Receiver',
      TE: 'Tight End',
      K: 'Kicker',
      DEF: 'Defense',
    }
    return positionMap[abbreviation] || abbreviation
  }

  /**
   * Delay utility for simulating async operations
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default MockDataProvider
