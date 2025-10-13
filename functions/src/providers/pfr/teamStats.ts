import { withResilience } from '../../agent/tools'
import { cache } from '../../cache/CacheClient'
import { log } from '../../observability/logger'
import { inc, observe } from '../../observability/metrics'
import {
  fetchPFRDataForTeams,
  fetchPFRTeamDataForGame,
} from './teamStatsScraper'
import type { PFRTeamData, PFRTeamInput, PFRTeamStats } from './types'

export interface TeamStatsProviderConfig {
  timeoutMs: number
  retries: number
  backoffMs: number
  cacheTtlMs: number
  maxConcurrent: number
}

export interface TeamStatsRequest {
  homeTeamCode: string
  awayTeamCode: string
  season: number
  week: number
}

export interface TeamStatsBatchRequest {
  teams: PFRTeamInput[]
  season: number
  week: number
}

export interface TeamStatsResponse {
  data: PFRTeamData
  cached: boolean
  durationMs: number
}

export interface TeamStatsBatchResponse {
  data: { [teamId: string]: PFRTeamStats | null }
  cached: boolean
  durationMs: number
}

export class TeamStatsProvider {
  private config: TeamStatsProviderConfig

  constructor(config: Partial<TeamStatsProviderConfig> = {}) {
    this.config = {
      timeoutMs: 15_000,
      retries: 2,
      backoffMs: 500,
      cacheTtlMs: 180_000, // 3 minutes
      maxConcurrent: 4,
      ...config,
    }
  }

  /**
   * Get team stats for a specific game
   */
  async getTeamStats(request: TeamStatsRequest): Promise<TeamStatsResponse> {
    const startTime = Date.now()
    const cacheKey = {
      homeTeam: request.homeTeamCode,
      awayTeam: request.awayTeamCode,
      season: request.season,
      week: request.week,
    }

    try {
      const result = await cache.getOrSet(
        'pfr_team_stats',
        cacheKey,
        async () => {
          inc('provider_calls_pfr_team_stats')
          return await this.fetchTeamStatsInternal(request)
        },
        {
          ttlMs: this.config.cacheTtlMs,
          version: '1.0.0',
        }
      )

      const durationMs = Date.now() - startTime
      observe('provider_duration_ms', durationMs)

      return {
        data: result,
        cached: true,
        durationMs,
      }
    } catch (error) {
      const durationMs = Date.now() - startTime
      observe('provider_duration_ms', durationMs)
      inc('provider_calls_error')

      log.error('team_stats.provider.error', {
        homeTeam: request.homeTeamCode,
        awayTeam: request.awayTeamCode,
        season: request.season,
        week: request.week,
        error: {
          code: 'provider_error',
          message: error instanceof Error ? error.message : String(error),
        },
        durationMs,
      })

      throw new Error(
        `Failed to fetch team stats: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Get team stats for multiple teams
   */
  async getTeamStatsBatch(
    request: TeamStatsBatchRequest
  ): Promise<TeamStatsBatchResponse> {
    const startTime = Date.now()
    const cacheKey = {
      teams: request.teams.map(t => t.teamId).sort(),
      season: request.season,
      week: request.week,
    }

    try {
      const result = await cache.getOrSet(
        'pfr_team_stats_batch',
        cacheKey,
        async () => {
          inc('provider_calls_pfr_team_stats_batch')
          return await this.fetchTeamStatsBatchInternal(request)
        },
        {
          ttlMs: this.config.cacheTtlMs,
          version: '1.0.0',
        }
      )

      const durationMs = Date.now() - startTime
      observe('provider_duration_ms', durationMs)

      return {
        data: result,
        cached: true,
        durationMs,
      }
    } catch (error) {
      const durationMs = Date.now() - startTime
      observe('provider_duration_ms', durationMs)
      inc('provider_calls_error')

      log.error('team_stats_batch.provider.error', {
        teamCount: request.teams.length,
        season: request.season,
        week: request.week,
        error: {
          code: 'batch_error',
          message: error instanceof Error ? error.message : String(error),
        },
        durationMs,
      })

      throw new Error(
        `Failed to fetch team stats batch: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Internal method to fetch team stats with resilience
   */
  private async fetchTeamStatsInternal(
    request: TeamStatsRequest
  ): Promise<PFRTeamData> {
    return await withResilience(
      'pfr_team_stats',
      async () => {
        const data = await fetchPFRTeamDataForGame(
          request.homeTeamCode,
          request.awayTeamCode,
          request.season,
          request.week
        )

        return data
      },
      {
        timeoutMs: this.config.timeoutMs,
        retries: this.config.retries,
        backoffMs: this.config.backoffMs,
      }
    )
  }

  /**
   * Internal method to fetch team stats batch with resilience
   */
  private async fetchTeamStatsBatchInternal(
    request: TeamStatsBatchRequest
  ): Promise<{ [teamId: string]: PFRTeamStats | null }> {
    return await withResilience(
      'pfr_team_stats_batch',
      async () => {
        const data = await fetchPFRDataForTeams(
          request.teams,
          request.season,
          request.week
        )

        return data
      },
      {
        timeoutMs: this.config.timeoutMs,
        retries: this.config.retries,
        backoffMs: this.config.backoffMs,
      }
    )
  }

  /**
   * Warm cache for popular teams
   */
  async warmPopularTeams(
    teams: PFRTeamInput[],
    season: number,
    week: number
  ): Promise<void> {
    try {
      await this.getTeamStatsBatch({ teams, season, week })
      log.info('team_stats.warm.success', {
        teamCount: teams.length,
        season,
        week,
      })
    } catch (error) {
      log.warn('team_stats.warm.failed', {
        teamCount: teams.length,
        season,
        week,
        error: {
          code: 'warm_error',
          message: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }
}

// Default provider instance
export const teamStatsProvider = new TeamStatsProvider()
