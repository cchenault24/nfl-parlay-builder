import { ParlayService } from '../../application/services/ParlayService'
import { Game } from '../../domain/entities/Game'
import { Parlay } from '../../domain/entities/Parlay'
import { Player } from '../../domain/entities/Player'
import { ProviderRepository } from '../../domain/repositories/ProviderRepository'
import { ProviderConfig } from '../../domain/value-objects/ProviderConfig'
import { Strategy } from '../../domain/value-objects/Strategy'
import { FirebaseParlayRepository } from '../repositories/FirebaseParlayRepository'

/**
 * Clean Architecture AI Service
 * Adapter that bridges the existing AI service with Clean Architecture
 */
export class CleanArchitectureAIService {
  private parlayService: ParlayService

  constructor(private providerRepository: ProviderRepository) {
    const parlayRepository = new FirebaseParlayRepository()

    this.parlayService = new ParlayService(
      parlayRepository,
      {} as any, // Mock game repository
      providerRepository,
      {
        defaultStrategy: Strategy.moderate(),
        fallbackProvider: new ProviderConfig(
          'mock',
          true,
          1,
          30000,
          3,
          'mock-key',
          'mock-model'
        ),
        maxRetries: 3,
        timeout: 30000,
      }
    )
  }

  /**
   * Generate parlay using Clean Architecture
   */
  async generateParlay(
    game: Game,
    players: Player[],
    strategy: Strategy,
    varietyFactors: any,
    options: {
      provider: string
      temperature: number
    }
  ): Promise<{
    parlay: Parlay
    metadata: {
      provider: string
      model?: string
      confidence: number
      latency: number
      tokens?: number
      fallbackUsed: boolean
      attemptCount: number
    }
  }> {
    try {
      // Get provider configuration
      const providerConfig = await this.providerRepository.findByName(
        options.provider
      )
      if (!providerConfig) {
        throw new Error(`Provider ${options.provider} not found`)
      }

      // Generate parlay using the service
      const result = await this.parlayService.generateParlay(
        game.id,
        strategy,
        options.provider,
        {
          temperature: options.temperature,
          includePlayerProps: varietyFactors.includePlayerProps,
          includeGameProps: varietyFactors.includeGameProps,
          includeTeamProps: varietyFactors.includeTeamProps,
        }
      )

      if (!result.success || !result.parlay) {
        throw new Error(result.error || 'Failed to generate parlay')
      }

      return {
        parlay: result.parlay,
        metadata: {
          provider: result.metadata?.provider || options.provider,
          model: result.metadata?.model,
          confidence:
            result.metadata?.confidence || result.parlay.overallConfidence,
          latency: result.metadata?.latency || 0,
          tokens: result.metadata?.tokens,
          fallbackUsed: false,
          attemptCount: 1,
        },
      }
    } catch (error) {
      // Fallback to mock provider

      const result = await this.parlayService.generateParlay(
        game.id,
        Strategy.moderate(),
        'mock',
        {
          temperature: options.temperature,
          includePlayerProps: varietyFactors.includePlayerProps,
          includeGameProps: varietyFactors.includeGameProps,
          includeTeamProps: varietyFactors.includeTeamProps,
        }
      )

      if (!result.success || !result.parlay) {
        throw new Error('Failed to generate parlay even with fallback')
      }

      return {
        parlay: result.parlay,
        metadata: {
          provider: 'mock',
          model: 'mock-model',
          confidence: result.parlay.overallConfidence,
          latency: 100,
          tokens: 0,
          fallbackUsed: true,
          attemptCount: 2,
        },
      }
    }
  }

  /**
   * Register provider
   */
  async registerProvider(name: string, config: ProviderConfig): Promise<void> {
    await this.providerRepository.save(config)
  }

  /**
   * Get available providers
   */
  async getAvailableProviders(): Promise<ProviderConfig[]> {
    return await this.providerRepository.findEnabled()
  }

  /**
   * Get provider health
   */
  async getProviderHealth(): Promise<Record<string, number>> {
    return await this.providerRepository.getHealthScores()
  }

  /**
   * Get parlay statistics
   */
  async getParlayStatistics(): Promise<{
    totalParlays: number
    averageConfidence: number
    riskLevelDistribution: Record<string, number>
    providerDistribution: Record<string, number>
    successRate: number
  }> {
    return await this.parlayService.getParlayStatistics()
  }

  /**
   * Get parlay recommendations
   */
  async getParlayRecommendations(gameId: string): Promise<{
    strategies: Strategy[]
    providers: ProviderConfig[]
    gameContext: any
  }> {
    return await this.parlayService.getParlayRecommendations(gameId)
  }
}
