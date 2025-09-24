// src/services/container.ts
import type { GeneratedParlay, ParlayOptions } from '@npb/shared'
import { FunctionsAPI } from './functionsClient'

/**
 * ParlayService is a thin facade over your Cloud Functions endpoint.
 * It hides HTTP details from the UI and returns strongly typed results.
 */
export interface ParlayService {
  /**
   * Generate a parlay for a given gameId using server-side orchestration.
   * The server composes rosters, injuries, weather, lines, etc., and calls the AI.
   */
  generate(gameId: string, options?: ParlayOptions): Promise<GeneratedParlay>
}

/**
 * Concrete implementation that calls Cloud Functions.
 */
class ParlayServiceImpl implements ParlayService {
  async generate(
    gameId: string,
    options?: ParlayOptions
  ): Promise<GeneratedParlay> {
    if (!gameId || typeof gameId !== 'string') {
      throw new Error('gameId is required')
    }

    const resp = await FunctionsAPI.generateParlay(gameId, options)

    if (!resp?.success) {
      const msg = resp?.error?.message || 'Parlay generation failed'
      throw new Error(msg)
    }

    if (!resp.data) {
      throw new Error('Parlay generation succeeded but no data was returned')
    }

    return resp.data
  }
}

/**
 * ServiceContainer exposes all frontend services.
 * Add additional thin clients here as you stand up more Functions endpoints.
 */
export class ServiceContainer {
  readonly parlay: ParlayService

  constructor() {
    this.parlay = new ParlayServiceImpl()
  }
}

/**
 * App-wide singleton. If you need testability, you can DI this in providers instead.
 */
export const container = new ServiceContainer()
