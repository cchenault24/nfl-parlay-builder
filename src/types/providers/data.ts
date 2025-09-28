// ================================================================================================
// DATA PROVIDER INTERFACES - Data source provider abstraction
// ================================================================================================

import { APIResponse } from '../core/api'
import { ESPNRosterResponse, ESPNScoreboardResponse } from '../external'
import { IProvider, ProviderConfig, ProviderMetadata } from './base'
import { PlayerStats, TeamStats, InjuryReport, WeatherData } from '../api'

/**
 * Data provider query options
 */
export interface DataQueryOptions {
  timeout?: number
  retries?: number
  cache?: boolean
  cacheTTL?: number
  params?: Record<string, string | number | boolean | undefined | null>
  headers?: Record<string, string>
  signal?: AbortSignal
}

/**
 * Data provider response with metadata
 */
export interface DataProviderResponse<T> extends APIResponse<T> {
  provider: string
  cached: boolean
  timestamp: Date
  cost?: number
}

/**
 * Data provider configuration
 */
export interface DataProviderConfig extends ProviderConfig {
  baseURL: string
  apiKey?: string
  rateLimit?: {
    requestsPerMinute: number
    requestsPerHour: number
  }
  cache?: {
    enabled: boolean
    ttl: number
  }
}

/**
 * Data provider metadata
 */
export interface DataProviderMetadata extends ProviderMetadata {
  type: 'data'
  supportedEndpoints: string[]
  dataQuality: 'high' | 'medium' | 'low'
  updateFrequency: 'real-time' | 'hourly' | 'daily'
}

/**
 * NFL Data Provider interface for all data source providers
 */
export interface IDataProvider extends IProvider {
  readonly metadata: DataProviderMetadata
  readonly config: DataProviderConfig

  /**
   * Get current week games
   */
  getCurrentWeekGames(
    options?: DataQueryOptions
  ): Promise<DataProviderResponse<ESPNScoreboardResponse>>

  /**
   * Get games for a specific week
   */
  getGamesByWeek(
    week: number,
    options?: DataQueryOptions
  ): Promise<DataProviderResponse<ESPNScoreboardResponse>>

  /**
   * Get team roster
   */
  getTeamRoster(
    teamId: string,
    options?: DataQueryOptions
  ): Promise<DataProviderResponse<ESPNRosterResponse>>

  /**
   * Get current NFL week number
   */
  getCurrentWeek(
    options?: DataQueryOptions
  ): Promise<DataProviderResponse<ESPNScoreboardResponse>>

  /**
   * Get available weeks for current season
   */
  getAvailableWeeks(
    options?: DataQueryOptions
  ): Promise<DataProviderResponse<number[]>>

  /**
   * Get player statistics
   */
  getPlayerStats(
    playerId: string,
    season?: number,
    options?: DataQueryOptions
  ): Promise<DataProviderResponse<PlayerStats>>

  /**
   * Get team statistics
   */
  getTeamStats(
    teamId: string,
    season?: number,
    options?: DataQueryOptions
  ): Promise<DataProviderResponse<TeamStats>>

  /**
   * Get injury reports
   */
  getInjuryReports(
    teamId?: string,
    options?: DataQueryOptions
  ): Promise<DataProviderResponse<InjuryReport[]>>

  /**
   * Get weather data for a game
   */
  getWeatherData(
    gameId: string,
    options?: DataQueryOptions
  ): Promise<DataProviderResponse<WeatherData>>
}

/**
 * Data Provider types
 */
export type DataProviderType = 'espn' | 'nfl' | 'sportradar' | 'mock'

/**
 * Data Provider factory configuration
 */
export interface DataProviderFactoryConfig {
  type: DataProviderType
  config: Partial<DataProviderConfig>
  apiKey?: string
}

/**
 * Data fusion configuration for combining multiple sources
 */
export interface DataFusionConfig {
  primaryProvider: DataProviderType
  fallbackProviders: DataProviderType[]
  validationRules: {
    consistencyThreshold: number
    conflictResolution: 'primary' | 'majority' | 'latest'
  }
  enrichment: {
    enabled: boolean
    providers: DataProviderType[]
  }
}
