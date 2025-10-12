// src/services/MockParlayService.ts - Mock data implementation
import { Game, ParlayGenerationOptions, ParlayGenerationResult } from '../types'
import { BaseParlayService } from './BaseParlayService'
import { ParlayMock } from './ParlayMock'

/**
 * Mock parlay service that generates local mock data
 */
export class MockParlayService extends BaseParlayService {
  /**
   * Generate parlay using local mock data
   */
  async generateParlay(
    game: Game,
    options: ParlayGenerationOptions = {}
  ): Promise<ParlayGenerationResult> {
    const startTime = Date.now()
    const { onLoadingUpdate } = options

    // Emit loading phase updates for mock mode
    if (onLoadingUpdate) {
      onLoadingUpdate({
        phase: 'simulating',
        progress: 0,
        message: 'Starting mock generation...',
        estimatedTimeRemaining: 2000,
      })
    }

    // Add 2-second delay to simulate real API response time
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Generate mock parlay and game data
    const parlay = ParlayMock.generateMockParlay(game)
    const gameData = ParlayMock.generateMockGameData(game)

    const latency = Date.now() - startTime

    return {
      parlay,
      gameData,
      rateLimitInfo: undefined, // No rate limiting for mock data
      metadata: this.createMetadata(
        'mock',
        'mock-generator',
        latency,
        parlay.parlayConfidence,
        {
          serviceMode: 'mock',
        }
      ),
    }
  }

  /**
   * Check service health (always returns healthy for mock)
   */
  async checkServiceHealth(): Promise<{
    healthy: boolean
    mode: 'mock'
    providers?: Array<{
      name: string
      healthy: boolean
      latency?: number
      lastError?: string
    }>
    timestamp: string
  }> {
    return {
      healthy: true,
      mode: 'mock',
      providers: [
        {
          name: 'mock-generator',
          healthy: true,
          latency: 0,
        },
      ],
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Get service mode for debugging
   */
  getServiceMode(): 'mock' {
    return 'mock'
  }

  /**
   * Check if service is properly configured (always true for mock)
   */
  isConfigured(): boolean {
    return true
  }
}
