import { Parlay } from '../../domain/entities/Parlay'
import { GameRepository } from '../../domain/repositories/GameRepository'
import { ParlayRepository } from '../../domain/repositories/ParlayRepository'
import { ProviderRepository } from '../../domain/repositories/ProviderRepository'
import { ProviderConfig } from '../../domain/value-objects/ProviderConfig'
import { Strategy } from '../../domain/value-objects/Strategy'
import { GenerateParlayUseCase } from '../use-cases/GenerateParlayUseCase'

export interface ParlayServiceConfig {
  defaultStrategy: Strategy
  fallbackProvider: ProviderConfig
  maxRetries: number
  timeout: number
}

/**
 * ParlayService
 * Application service for parlay operations
 */
export class ParlayService {
  private generateParlayUseCase: GenerateParlayUseCase

  constructor(
    private parlayRepository: ParlayRepository,
    private gameRepository: GameRepository,
    private providerRepository: ProviderRepository,
    private config: ParlayServiceConfig
  ) {
    this.generateParlayUseCase = new GenerateParlayUseCase(
      parlayRepository,
      gameRepository,
      {} as any // PlayerRepository - mock for now
    )
  }

  /**
   * Generate a new parlay
   */
  async generateParlay(
    gameId: string,
    strategy?: Strategy,
    providerName?: string,
    options?: {
      temperature?: number
      maxLegs?: number
      minLegs?: number
      includePlayerProps?: boolean
      includeGameProps?: boolean
      includeTeamProps?: boolean
    }
  ): Promise<{
    success: boolean
    parlay?: Parlay
    error?: string
    metadata?: any
  }> {
    try {
      // Get strategy
      const selectedStrategy = strategy || this.config.defaultStrategy

      // Get provider
      const provider = await this.getProvider(providerName)
      if (!provider) {
        return {
          success: false,
          error: 'No available provider found',
        }
      }

      // Generate parlay
      const result = await this.generateParlayUseCase.execute({
        gameId,
        strategy: selectedStrategy,
        providerConfig: provider,
        options,
      })

      return result
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Get parlay by ID
   */
  async getParlay(id: string): Promise<Parlay | null> {
    return await this.parlayRepository.findById(id)
  }

  /**
   * Get parlays by game ID
   */
  async getParlaysByGame(gameId: string): Promise<Parlay[]> {
    return await this.parlayRepository.findByGameId(gameId)
  }

  /**
   * Get parlay history
   */
  async getParlayHistory(limit: number = 10): Promise<Parlay[]> {
    return await this.parlayRepository.getRecent(limit)
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
    return await this.parlayRepository.getStatistics()
  }

  /**
   * Search parlays
   */
  async searchParlays(criteria: {
    gameId?: string
    provider?: string
    riskLevel?: 'low' | 'medium' | 'high'
    minConfidence?: number
    maxConfidence?: number
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<Parlay[]> {
    return await this.parlayRepository.search(criteria)
  }

  /**
   * Get available strategies
   */
  getAvailableStrategies(): Strategy[] {
    return [Strategy.conservative(), Strategy.moderate(), Strategy.aggressive()]
  }

  /**
   * Get available providers
   */
  async getAvailableProviders(): Promise<ProviderConfig[]> {
    return await this.providerRepository.findEnabled()
  }

  /**
   * Get provider by name
   */
  async getProvider(name?: string): Promise<ProviderConfig | null> {
    if (name) {
      return await this.providerRepository.findByName(name)
    }

    // Get highest priority enabled provider
    const providers = await this.providerRepository.findEnabled()
    if (providers.length === 0) {
      return this.config.fallbackProvider
    }

    return providers.sort((a, b) => b.priority - a.priority)[0]
  }

  /**
   * Validate parlay
   */
  validateParlay(parlay: Parlay): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!parlay.validate()) {
      errors.push('Parlay validation failed')
    }

    if (parlay.hasConflictingLegs()) {
      errors.push('Parlay has conflicting legs')
    }

    if (parlay.getTemplateRisk() === 'high') {
      errors.push('Parlay follows a high-risk template pattern')
    }

    if (parlay.getVarietyScore() < 0.5) {
      errors.push('Parlay has low variety score')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get parlay recommendations
   */
  async getParlayRecommendations(gameId: string): Promise<{
    strategies: Strategy[]
    providers: ProviderConfig[]
    gameContext: any
  }> {
    const game = await this.gameRepository.findById(gameId)
    if (!game) {
      throw new Error('Game not found')
    }

    const strategies = this.getAvailableStrategies()
    const providers = await this.getAvailableProviders()
    const gameContext = game.getGameContext()

    return {
      strategies,
      providers,
      gameContext,
    }
  }
}
