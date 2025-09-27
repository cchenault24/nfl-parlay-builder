// src/services/container.ts
import type { GeneratedParlay, ParlayOptions } from '@npb/shared'
import { FunctionsNFLClient } from '../api/clients/FunctionsNFLClient'
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
    const resp = await FunctionsAPI.generateParlay(gameId, options)
    if (!resp?.success) {
      throw new Error(resp?.error?.message || 'Parlay generation failed')
    }
    if (!resp.data) {
      throw new Error('Parlay generation succeeded but no data was returned')
    }
    return resp.data
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
