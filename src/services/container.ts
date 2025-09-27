import { FunctionsNFLClient } from '../api/clients/FunctionsNFLClient'
import {
  GeneratedParlay,
  GenerateParlayResponse,
  ParlayOptions,
} from '../types'
import { FunctionsAPI } from './functionsClient'

export interface ParlayService {
  generate(gameId: string, options?: ParlayOptions): Promise<GeneratedParlay>
}

class ParlayServiceImpl implements ParlayService {
  async generate(
    gameId: string,
    options?: ParlayOptions
  ): Promise<GeneratedParlay> {
    if (!gameId || typeof gameId !== 'string') {
      throw new Error('gameId is required')
    }

    const resp = (await FunctionsAPI.generateParlay(
      gameId,
      options
    )) as GenerateParlayResponse

    if (!resp?.success) {
      // Handle both string and object error formats
      const errorMessage = this.extractErrorMessage(resp?.error)
      throw new Error(errorMessage)
    }

    if (!resp.parlay) {
      throw new Error('Parlay generation succeeded but no parlay was returned')
    }

    return resp.parlay
  }

  /**
   * Extract error message from either string or object error format
   */
  private extractErrorMessage(
    error?: string | { code?: string; message: string; details?: unknown }
  ): string {
    if (!error) {
      return 'Parlay generation failed'
    }

    if (typeof error === 'string') {
      return error
    }

    if (typeof error === 'object' && error.message) {
      // Include error code if available for better debugging
      return error.code ? `${error.code}: ${error.message}` : error.message
    }

    return 'Parlay generation failed'
  }
}

export class ServiceContainer {
  readonly parlay: ParlayService
  readonly nflData: FunctionsNFLClient

  constructor() {
    this.parlay = new ParlayServiceImpl()
    this.nflData = new FunctionsNFLClient()
  }
}

export const container = new ServiceContainer()

// Back-compat, safe to delete once all callers migrate
export function getNFLDataService(): FunctionsNFLClient {
  return container.nflData
}

export function getParlayService(): ParlayService {
  return container.parlay
}
