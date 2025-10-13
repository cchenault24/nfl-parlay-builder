import { withResilience } from '../../agent/tools'
import { cache } from '../../cache/CacheClient'
import { log } from '../../observability/logger'
import { inc, observe } from '../../observability/metrics'
import { fetchPFRSeasonSchedule } from './scheduleScraper'
import type { PFRGameItem } from './types'

export interface ScheduleProviderConfig {
  timeoutMs: number
  retries: number
  backoffMs: number
  cacheTtlMs: number
}

export interface ScheduleRequest {
  season: number
  week: number
}

export interface ScheduleResponse {
  schedule: PFRGameItem[]
  cached: boolean
  durationMs: number
}

export class ScheduleProvider {
  private config: ScheduleProviderConfig

  constructor(config: Partial<ScheduleProviderConfig> = {}) {
    this.config = {
      timeoutMs: 10_000,
      retries: 2,
      backoffMs: 500,
      cacheTtlMs: 300_000, // 5 minutes
      ...config,
    }
  }

  /**
   * Get schedule for a specific week
   */
  async getSchedule(request: ScheduleRequest): Promise<ScheduleResponse> {
    const startTime = Date.now()
    const cacheKey = { season: request.season, week: request.week }

    try {
      const result = await cache.getOrSet(
        'pfr_schedule',
        cacheKey,
        async () => {
          inc('provider_calls_pfr_schedule')
          return await this.fetchScheduleInternal(request)
        },
        {
          ttlMs: this.config.cacheTtlMs,
          version: '1.0.0',
        }
      )

      const durationMs = Date.now() - startTime
      observe('provider_duration_ms', durationMs)

      return {
        schedule: result,
        cached: true, // Will be true due to getOrSet
        durationMs,
      }
    } catch (error) {
      const durationMs = Date.now() - startTime
      observe('provider_duration_ms', durationMs)
      inc('provider_calls_error')

      log.error('schedule.provider.error', {
        season: request.season,
        week: request.week,
        error: {
          code: 'provider_error',
          message: error instanceof Error ? error.message : String(error),
        },
        durationMs,
      })

      throw new Error(
        `Failed to fetch schedule: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Internal method to fetch schedule with resilience
   */
  private async fetchScheduleInternal(
    _request: ScheduleRequest
  ): Promise<PFRGameItem[]> {
    return await withResilience(
      'pfr_schedule',
      async () => {
        const schedule = await fetchPFRSeasonSchedule()

        return schedule
      },
      {
        timeoutMs: this.config.timeoutMs,
        retries: this.config.retries,
        backoffMs: this.config.backoffMs,
      }
    )
  }

  /**
   * Get multiple weeks of schedules in parallel
   */
  async getMultipleSchedules(
    requests: ScheduleRequest[]
  ): Promise<ScheduleResponse[]> {
    const startTime = Date.now()

    try {
      const results = await Promise.all(
        requests.map(request => this.getSchedule(request))
      )

      const durationMs = Date.now() - startTime
      observe('provider_batch_duration_ms', durationMs)

      return results
    } catch (error) {
      const durationMs = Date.now() - startTime
      observe('provider_batch_duration_ms', durationMs)

      log.error('schedule.batch.error', {
        count: requests.length,
        error: {
          code: 'batch_error',
          message: error instanceof Error ? error.message : String(error),
        },
        durationMs,
      })

      throw error
    }
  }

  /**
   * Warm cache for current week
   */
  async warmCurrentWeek(season: number, week: number): Promise<void> {
    try {
      await this.getSchedule({ season, week })
      log.info('schedule.warm.success', { season, week })
    } catch (error) {
      log.warn('schedule.warm.failed', {
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
export const scheduleProvider = new ScheduleProvider()
