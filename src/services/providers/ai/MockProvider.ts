// ================================================================================================
// MOCK PROVIDER - Mock implementation of IAIProvider interface for testing
// ================================================================================================

import { GameRosters, GeneratedParlay, NFLGame } from '../../../types/domain'
import {
  AIGenerationContext,
  AIProviderConfig,
  AIProviderMetadata,
  AIProviderResponse,
  IAIProvider,
  ProviderHealth,
} from '../../../types/providers'

/**
 * Mock provider configuration
 */
export interface MockProviderConfig extends AIProviderConfig {
  enableErrorSimulation?: boolean
  errorRate?: number
  debugMode?: boolean
  defaultConfidence?: number
  responseDelay?: number
}

/**
 * Mock AI provider implementation for testing and development
 */
export class MockProvider implements IAIProvider {
  public readonly metadata: AIProviderMetadata
  public readonly config: MockProviderConfig
  private health: ProviderHealth
  private initialized: boolean = false
  private errorCount: number = 0
  private requestCount: number = 0

  constructor(config: Partial<MockProviderConfig> = {}) {
    this.config = {
      ...config,
      name: config.name || 'mock',
      enabled: config.enabled !== undefined ? config.enabled : true,
      priority: config.priority || 1,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      model: config.model || 'mock-gpt-4',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4000,
      enableErrorSimulation: config.enableErrorSimulation || false,
      errorRate: config.errorRate || 0.1,
      debugMode: config.debugMode || false,
      defaultConfidence: config.defaultConfidence || 7,
      responseDelay: config.responseDelay || 1000,
    }

    this.metadata = {
      name: 'Mock AI Provider',
      version: '1.0.0',
      type: 'ai',
      capabilities: [
        'chat_completion',
        'json_mode',
        'temperature_control',
        'error_simulation',
        'debug_mode',
      ],
      supportedModels: ['mock-gpt-4', 'mock-claude', 'mock-gemini'],
      maxTokens: 4000,
      supportsStreaming: false,
      supportsJsonMode: true,
      costPerRequest: 0, // Free for testing
    }

    this.health = {
      name: this.config.name,
      healthy: true,
      lastChecked: new Date(),
      uptime: 0,
    }
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    // Simulate initialization delay
    await this.delay(100)

    this.initialized = true
    this.updateHealth(true)

    if (this.config.debugMode) {
      if (import.meta.env.DEV) {
        console.debug('Mock AI Provider initialized successfully')
      }
    }
  }

  /**
   * Validate provider connection
   */
  async validateConnection(): Promise<boolean> {
    // Simulate connection validation
    await this.delay(50)

    if (
      this.config.enableErrorSimulation &&
      Math.random() < this.config.errorRate!
    ) {
      return false
    }

    return true
  }

  /**
   * Get current provider health status
   */
  getHealth(): ProviderHealth {
    return { ...this.health }
  }

  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<AIProviderConfig>): void {
    Object.assign(this.config, config)
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    this.initialized = false
    this.updateHealth(false)

    if (this.config.debugMode) {
      if (import.meta.env.DEV) {
        console.debug('Mock AI Provider disposed')
      }
    }
  }

  /**
   * Generate a parlay using mock AI
   */
  async generateParlay(
    game: NFLGame,
    rosters: GameRosters,
    context: AIGenerationContext
  ): Promise<AIProviderResponse> {
    if (!this.initialized) {
      await this.initialize()
    }

    const startTime = Date.now()
    this.requestCount++

    try {
      // Simulate response delay
      await this.delay(this.config.responseDelay!)

      // Simulate error if enabled
      if (
        this.config.enableErrorSimulation &&
        Math.random() < this.config.errorRate!
      ) {
        this.errorCount++
        throw new Error(`Mock error simulation (error #${this.errorCount})`)
      }

      // Validate inputs
      this.validateInputs(game, rosters, context)

      // Generate mock parlay
      const parlay = this.generateMockParlay(game, rosters, context)
      const latency = Date.now() - startTime

      this.updateHealth(true, latency)

      if (this.config.debugMode && import.meta.env.DEV) {
        console.log(
          `Mock AI generated parlay for ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`
        )
      }

      return {
        parlay,
        metadata: {
          provider: this.config.name,
          model: this.config.model,
          tokens: this.estimateTokens(context),
          latency,
          confidence: parlay.overallConfidence,
          cost: 0,
        },
      }
    } catch (error) {
      this.updateHealth(
        false,
        undefined,
        error instanceof Error ? error.message : 'Generation failed'
      )
      throw error
    }
  }

  /**
   * Get available models for this provider
   */
  getAvailableModels(): string[] {
    return this.metadata.supportedModels
  }

  /**
   * Update model configuration
   */
  updateModel(model: string, config?: Partial<AIProviderConfig>): void {
    this.config.model = model
    if (config) {
      this.updateConfig(config)
    }
  }

  /**
   * Get cost estimate for a request
   */
  estimateCost(context: AIGenerationContext): number {
    return 0 // Free for testing
  }

  // ===== PRIVATE METHODS =====

  /**
   * Update health status
   */
  private updateHealth(
    healthy: boolean,
    responseTime?: number,
    error?: string
  ): void {
    this.health = {
      ...this.health,
      healthy,
      lastChecked: new Date(),
      responseTime,
      lastError: error,
      uptime: healthy ? this.health.uptime + 1 : this.health.uptime,
    }
  }

  /**
   * Validate inputs
   */
  private validateInputs(
    game: NFLGame,
    rosters: GameRosters,
    context: AIGenerationContext
  ): void {
    if (!game) {
      throw new Error('Game data is required')
    }

    if (!rosters || !rosters.homeRoster || !rosters.awayRoster) {
      throw new Error('Complete roster data is required')
    }

    if (rosters.homeRoster.length === 0 || rosters.awayRoster.length === 0) {
      throw new Error('Rosters cannot be empty')
    }

    if (!context.strategy) {
      throw new Error('Strategy configuration is required')
    }

    if (!context.varietyFactors) {
      throw new Error('Variety factors are required')
    }
  }

  /**
   * Generate mock parlay data
   */
  private generateMockParlay(
    game: NFLGame,
    rosters: GameRosters,
    context: AIGenerationContext
  ): GeneratedParlay {
    const betTypes = ['spread', 'total', 'moneyline', 'player_prop']
    const legs = []

    // Generate 3 legs
    for (let i = 0; i < 3; i++) {
      const betType = betTypes[i % betTypes.length]
      const confidence =
        this.config.defaultConfidence! + (Math.random() - 0.5) * 2
      const odds = this.generateMockOdds(betType)

      let selection = ''
      let target = ''
      let reasoning = ''

      switch (betType) {
        case 'spread':
          selection = `${game.homeTeam.displayName} -${Math.floor(Math.random() * 7) + 3}`
          target = `${Math.floor(Math.random() * 7) + 3}`
          reasoning = `Home field advantage and recent form favor ${game.homeTeam.displayName}`
          break
        case 'total':
          selection = `Over ${Math.floor(Math.random() * 20) + 40}`
          target = `${Math.floor(Math.random() * 20) + 40}`
          reasoning = `Both teams have strong offensive units and favorable weather conditions`
          break
        case 'moneyline':
          selection = `${game.homeTeam.displayName} to win`
          target = 'Win'
          reasoning = `Superior coaching and home field advantage give ${game.homeTeam.displayName} the edge`
          break
        case 'player_prop':
          const homePlayers = rosters.homeRoster.filter(
            p =>
              p.position?.abbreviation === 'QB' ||
              p.position?.abbreviation === 'RB'
          )
          const awayPlayers = rosters.awayRoster.filter(
            p =>
              p.position?.abbreviation === 'QB' ||
              p.position?.abbreviation === 'RB'
          )
          const allPlayers = [...homePlayers, ...awayPlayers]
          const player =
            allPlayers[Math.floor(Math.random() * allPlayers.length)]

          if (player.position?.abbreviation === 'QB') {
            selection = `${player.displayName} Over ${Math.floor(Math.random() * 100) + 200} passing yards`
            target = `${Math.floor(Math.random() * 100) + 200}`
            reasoning = `${player.displayName} has been consistent this season and faces a favorable matchup`
          } else {
            selection = `${player.displayName} Over ${Math.floor(Math.random() * 50) + 50} rushing yards`
            target = `${Math.floor(Math.random() * 50) + 50}`
            reasoning = `${player.displayName} should see increased touches due to game script`
          }
          break
      }

      legs.push({
        id: `leg-${i + 1}`,
        betType,
        selection,
        target,
        reasoning,
        confidence: Math.min(Math.max(confidence, 1), 10),
        odds,
      })
    }

    const overallConfidence =
      legs.reduce((sum, leg) => sum + leg.confidence, 0) / legs.length
    const individualOdds = legs.map(leg => leg.odds)
    const estimatedOdds = this.calculateParlayOdds(individualOdds)

    return {
      id: this.generateParlayId(),
      legs: legs as [any, any, any], // Type assertion for now
      gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - Week ${game.week}`,
      aiReasoning: `Mock AI generated parlay using ${context.strategy.name} strategy. This is simulated data for testing purposes.`,
      overallConfidence: Math.min(Math.max(overallConfidence, 1), 10),
      estimatedOdds,
      createdAt: new Date().toISOString(),
      gameSummary: {
        matchupAnalysis: `${game.awayTeam.displayName} vs ${game.homeTeam.displayName} presents an interesting matchup. Both teams have strengths and weaknesses that could determine the outcome.`,
        gameFlow: [
          'high_scoring_shootout',
          'defensive_grind',
          'balanced_tempo',
          'potential_blowout',
        ][Math.floor(Math.random() * 4)],
        keyFactors: [
          'Weather conditions',
          'Key player availability',
          'Recent team form',
          'Head-to-head history',
          'Coaching matchups',
        ],
        prediction: `This should be a competitive game between ${game.awayTeam.displayName} and ${game.homeTeam.displayName}. The outcome will likely depend on execution in key moments.`,
        confidence: Math.min(Math.max(overallConfidence, 1), 10),
      },
    }
  }

  /**
   * Generate mock odds for different bet types
   */
  private generateMockOdds(betType: string): string {
    const oddsMap: Record<string, string[]> = {
      spread: ['-110', '-105', '-115'],
      total: ['-110', '-105', '-115'],
      moneyline: ['-150', '-120', '-200'],
      player_prop: ['-110', '-105', '-115', '-120'],
    }

    const options = oddsMap[betType] || ['-110']
    return options[Math.floor(Math.random() * options.length)]
  }

  /**
   * Calculate parlay odds from individual leg odds
   */
  private calculateParlayOdds(individualOdds: string[]): string {
    let combinedDecimal = 1

    individualOdds.forEach(odds => {
      const num = parseInt(odds)
      const decimal = num > 0 ? num / 100 + 1 : 100 / Math.abs(num) + 1
      combinedDecimal *= decimal
    })

    const americanOdds =
      combinedDecimal >= 2
        ? Math.round((combinedDecimal - 1) * 100)
        : Math.round(-100 / (combinedDecimal - 1))

    return americanOdds > 0 ? `+${americanOdds}` : `${americanOdds}`
  }

  /**
   * Generate a unique parlay ID
   */
  private generateParlayId(): string {
    return `parlay-${this.config.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Estimate tokens for cost calculation
   */
  private estimateTokens(context: AIGenerationContext): number {
    // Rough estimation
    return 1000 + Math.floor(Math.random() * 500)
  }

  /**
   * Delay utility for simulating async operations
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default MockProvider
