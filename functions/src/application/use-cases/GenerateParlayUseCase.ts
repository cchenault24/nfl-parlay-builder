import { Game } from '../../domain/entities/Game'
import { Parlay } from '../../domain/entities/Parlay'
import { Player } from '../../domain/entities/Player'
import { GameRepository } from '../../domain/repositories/GameRepository'
import { ParlayRepository } from '../../domain/repositories/ParlayRepository'
import { PlayerRepository } from '../../domain/repositories/PlayerRepository'
import { ProviderConfig } from '../../domain/value-objects/ProviderConfig'
import { Strategy } from '../../domain/value-objects/Strategy'

export interface GenerateParlayRequest {
  gameId: string
  strategy: Strategy
  providerConfig: ProviderConfig
  options?: {
    temperature?: number
    maxLegs?: number
    minLegs?: number
    includePlayerProps?: boolean
    includeGameProps?: boolean
    includeTeamProps?: boolean
  }
}

export interface GenerateParlayResponse {
  success: boolean
  parlay?: Parlay
  error?: string
  metadata?: {
    provider: string
    model?: string
    latency: number
    tokens?: number
    confidence: number
    varietyScore: number
    templateRisk: 'low' | 'medium' | 'high'
  }
}

/**
 * GenerateParlayUseCase
 * Orchestrates parlay generation using domain entities and repositories
 */
export class GenerateParlayUseCase {
  constructor(
    private parlayRepository: ParlayRepository,
    private gameRepository: GameRepository,
    private playerRepository: PlayerRepository
  ) {}

  /**
   * Execute parlay generation
   */
  async execute(
    request: GenerateParlayRequest
  ): Promise<GenerateParlayResponse> {
    try {
      // Validate request
      const validation = this.validateRequest(request)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        }
      }

      // Get game data
      const game = await this.gameRepository.findById(request.gameId)
      if (!game) {
        return {
          success: false,
          error: 'Game not found',
        }
      }

      // Get players for the game
      const players = await this.getGamePlayers(game)

      // Generate parlay using AI service
      const parlay = await this.generateParlayWithAI(
        game,
        players,
        request.strategy,
        request.providerConfig,
        request.options
      )

      // Save parlay
      await this.parlayRepository.save(parlay)

      // Return response
      return {
        success: true,
        parlay,
        metadata: {
          provider: parlay.metadata?.provider || 'unknown',
          model: parlay.metadata?.model,
          latency: parlay.metadata?.latency || 0,
          tokens: parlay.metadata?.tokens,
          confidence: parlay.overallConfidence,
          varietyScore: parlay.getVarietyScore(),
          templateRisk: parlay.getTemplateRisk(),
        },
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Validate request
   */
  private validateRequest(request: GenerateParlayRequest): {
    isValid: boolean
    error?: string
  } {
    if (!request.gameId) {
      return { isValid: false, error: 'Game ID is required' }
    }

    if (!request.strategy) {
      return { isValid: false, error: 'Strategy is required' }
    }

    if (!request.providerConfig) {
      return { isValid: false, error: 'Provider configuration is required' }
    }

    if (!request.providerConfig.isAvailable()) {
      return { isValid: false, error: 'Provider is not available' }
    }

    return { isValid: true }
  }

  /**
   * Get players for the game
   */
  private async getGamePlayers(game: Game): Promise<Player[]> {
    const homeTeamPlayers = await this.playerRepository.findByTeam(
      game.homeTeam.id
    )
    const awayTeamPlayers = await this.playerRepository.findByTeam(
      game.awayTeam.id
    )

    return [...homeTeamPlayers, ...awayTeamPlayers]
  }

  /**
   * Generate parlay using AI service
   */
  private async generateParlayWithAI(
    game: Game,
    players: Player[],
    strategy: Strategy,
    providerConfig: ProviderConfig,
    options?: GenerateParlayRequest['options']
  ): Promise<Parlay> {
    // This would integrate with the existing AI service
    // For now, we'll create a mock implementation

    const startTime = Date.now()

    // Mock parlay generation logic
    const parlay = this.createMockParlay(
      game,
      players,
      strategy,
      providerConfig
    )

    const latency = Date.now() - startTime

    // Add metadata
    const metadata = {
      provider: providerConfig.name,
      model: providerConfig.model || 'unknown',
      generatedAt: new Date().toISOString(),
      latency,
      tokens: Math.floor(Math.random() * 1000) + 500,
      confidence: parlay.overallConfidence,
      fallbackUsed: false,
      attemptCount: 1,
    }

    return new Parlay(
      parlay.id,
      parlay.legs,
      parlay.gameContext,
      parlay.aiReasoning,
      parlay.overallConfidence,
      parlay.estimatedOdds,
      parlay.gameId,
      parlay.gameSummary,
      metadata,
      parlay.createdAt,
      parlay.updatedAt
    )
  }

  /**
   * Create mock parlay for testing
   */
  private createMockParlay(
    game: Game,
    players: Player[],
    strategy: Strategy,
    providerConfig: ProviderConfig
  ): Parlay {
    // This is a simplified mock implementation
    // In a real implementation, this would use the AI service

    const id = `parlay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const gameContext = game.getMatchup()

    // Mock parlay legs based on strategy
    const legs = this.generateMockLegs(game, players, strategy)

    const overallConfidence = strategy.getAdjustedConfidence(7)
    const estimatedOdds = this.calculateEstimatedOdds(legs)

    return new Parlay(
      id,
      legs,
      gameContext,
      `Generated using ${strategy.name} strategy`,
      overallConfidence,
      estimatedOdds,
      game.id,
      undefined,
      {
        provider: providerConfig.name,
        model: providerConfig.model || 'unknown',
        generatedAt: new Date().toISOString(),
        varietyScore: 0.8,
        templateRisk: 'low',
      }
    )
  }

  /**
   * Generate mock parlay legs
   */
  private generateMockLegs(
    game: Game,
    players: Player[],
    strategy: Strategy
  ): any[] {
    // This is a simplified mock implementation
    // In a real implementation, this would use the AI service to generate legs

    const legs = []
    const betTypes = ['spread', 'total', 'player_passing']

    for (let i = 0; i < 3; i++) {
      const betType = betTypes[i]
      const leg = {
        id: `leg_${i + 1}`,
        betType,
        selection: this.getMockSelection(betType, game, players),
        target: this.getMockTarget(betType),
        reasoning: `Mock reasoning for ${betType}`,
        confidence: strategy.getAdjustedConfidence(6 + i),
        odds: this.getMockOdds(betType),
      }
      legs.push(leg)
    }

    return legs
  }

  /**
   * Get mock selection for bet type
   */
  private getMockSelection(
    betType: string,
    game: Game,
    players: Player[]
  ): string {
    switch (betType) {
      case 'spread':
        return `${game.awayTeam.displayName} +7`
      case 'total':
        return 'Over 45.5'
      case 'player_passing':
        const qb = players.find(p => p.position.abbreviation === 'QB')
        return `${qb?.displayName || 'QB'} Over 250.5 passing yards`
      default:
        return 'Mock selection'
    }
  }

  /**
   * Get mock target for bet type
   */
  private getMockTarget(betType: string): string {
    switch (betType) {
      case 'spread':
        return '7'
      case 'total':
        return '45.5'
      case 'player_passing':
        return '250.5'
      default:
        return 'Mock target'
    }
  }

  /**
   * Get mock odds for bet type
   */
  private getMockOdds(betType: string): string {
    switch (betType) {
      case 'spread':
        return '-110'
      case 'total':
        return '-110'
      case 'player_passing':
        return '+100'
      default:
        return '-110'
    }
  }

  /**
   * Calculate estimated odds for parlay
   */
  private calculateEstimatedOdds(legs: any[]): string {
    // Simplified odds calculation
    const legOdds = legs.map(leg => {
      const odds = leg.odds
      if (odds.startsWith('+')) {
        return parseInt(odds) / 100 + 1
      } else {
        return 100 / Math.abs(parseInt(odds)) + 1
      }
    })

    const totalOdds = legOdds.reduce((acc, odds) => acc * odds, 1)
    const americanOdds =
      totalOdds > 2
        ? `+${Math.round((totalOdds - 1) * 100)}`
        : `${Math.round(-100 / (totalOdds - 1))}`

    return americanOdds
  }
}
