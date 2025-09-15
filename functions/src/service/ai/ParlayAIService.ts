import {
  CloudFunctionError,
  GameRosters,
  GeneratedParlay,
  NFLGame,
  StrategyConfig,
  VarietyFactors,
} from '../../types'
import { BaseParlayProvider, ProviderConfig } from './BaseParlayProvider'
import { ContextBuilder } from './ContextBuilder'
import { OpenAIProvider } from './OpenAIProvider'

/**
 * Supported AI providers
 */
export type AIProviderType = 'openai' | 'anthropic' | 'google' | 'local'

/**
 * Provider-specific configurations
 */
export interface AIProviderConfigs {
  openai?: ProviderConfig & {
    model?: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo'
    maxTokens?: number
  }
  anthropic?: ProviderConfig & {
    model?: 'claude-3-sonnet' | 'claude-3-opus'
    maxTokens?: number
  }
  google?: ProviderConfig & {
    model?: 'gemini-pro' | 'gemini-ultra'
    maxTokens?: number
  }
  local?: ProviderConfig & {
    endpoint?: string
    model?: string
  }
}

/**
 * Generation options for parlay creation
 */
export interface GenerationOptions {
  temperature?: number
  maxRetries?: number
  strategy?: string
  varietyFactors?: Partial<VarietyFactors>
}

/**
 * Generic AI service for parlay generation
 * Supports multiple AI providers with consistent interface
 */
export class ParlayAIService {
  private providers: Map<AIProviderType, BaseParlayProvider> = new Map()
  private defaultProvider: AIProviderType = 'openai'

  constructor(configs: AIProviderConfigs) {
    this.initializeProviders(configs)
  }

  /**
   * Generate parlay using specified or default provider
   */
  async generateParlay(
    game: NFLGame,
    rosters: GameRosters,
    options: GenerationOptions & { provider?: AIProviderType } = {}
  ): Promise<GeneratedParlay> {
    const providerType = options.provider || this.defaultProvider
    const provider = this.providers.get(providerType)

    if (!provider) {
      throw new CloudFunctionError(
        'PROVIDER_NOT_AVAILABLE',
        `AI provider '${providerType}' is not configured or available`
      )
    }

    try {
      // Build comprehensive generation context
      const context = this.buildGenerationContext(game, rosters, options)

      // Generate parlay using the specified provider
      const parlay = await provider.generateParlay(game, rosters, context)

      // Add provider metadata
      const modelInfo = provider.getModelInfo()
      return {
        ...parlay,
        metadata: {
          provider: modelInfo.provider,
          model: modelInfo.model,
          generatedAt: new Date().toISOString(),
        },
      }
    } catch (error) {
      console.error(`Error generating parlay with ${providerType}:`, error)

      // If the error is retryable and we have fallback providers, try them
      if (this.shouldTryFallback(error, options)) {
        return this.tryFallbackProviders(game, rosters, options, [providerType])
      }

      throw error
    }
  }

  /**
   * Validate all configured providers
   */
  async validateProviders(): Promise<Record<AIProviderType, boolean>> {
    const results: Record<string, boolean> = {}

    for (const [type, provider] of this.providers) {
      try {
        results[type] = await provider.validateConnection()
      } catch (error) {
        console.error(`Provider ${type} validation failed:`, error)
        results[type] = false
      }
    }

    return results as Record<AIProviderType, boolean>
  }

  /**
   * Get information about all configured providers
   */
  getProviderInfo(): Record<AIProviderType, any> {
    const info: Record<string, any> = {}

    for (const [type, provider] of this.providers) {
      info[type] = provider.getModelInfo()
    }

    return info as Record<AIProviderType, any>
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(provider: AIProviderType): void {
    if (!this.providers.has(provider)) {
      throw new CloudFunctionError(
        'INVALID_PROVIDER',
        `Provider '${provider}' is not configured`
      )
    }
    this.defaultProvider = provider
  }

  /**
   * Check if a specific provider is available
   */
  isProviderAvailable(provider: AIProviderType): boolean {
    return this.providers.has(provider)
  }

  // === Private Methods ===

  /**
   * Initialize AI providers based on configurations
   */
  private initializeProviders(configs: AIProviderConfigs): void {
    // Initialize OpenAI provider
    if (configs.openai?.apiKey) {
      try {
        this.providers.set('openai', new OpenAIProvider(configs.openai))
      } catch (error) {
        console.error('Failed to initialize OpenAI provider:', error)
      }
    }

    // Initialize Anthropic provider (placeholder for future implementation)
    if (configs.anthropic?.apiKey) {
      console.log(
        'Anthropic provider configuration found but not yet implemented'
      )
      // TODO: Implement AnthropicProvider
    }

    // Initialize Google provider (placeholder for future implementation)
    if (configs.google?.apiKey) {
      console.log('Google provider configuration found but not yet implemented')
      // TODO: Implement GoogleProvider
    }

    // Initialize local provider (placeholder for future implementation)
    if (configs.local?.endpoint) {
      console.log('Local provider configuration found but not yet implemented')
      // TODO: Implement LocalProvider
    }

    if (this.providers.size === 0) {
      throw new CloudFunctionError(
        'NO_PROVIDERS_CONFIGURED',
        'No AI providers were successfully configured'
      )
    }

    // Set default provider to the first available one
    this.defaultProvider = Array.from(this.providers.keys())[0]
  }

  /**
   * Build comprehensive generation context
   */
  private buildGenerationContext(
    game: NFLGame,
    rosters: GameRosters,
    options: GenerationOptions
  ) {
    // Get or generate strategy
    const strategy = this.getStrategy(options.strategy)

    // Generate or merge variety factors
    const varietyFactors = this.generateVarietyFactors(
      rosters,
      options.varietyFactors
    )

    // Build context using ContextBuilder
    return ContextBuilder.buildGenerationContext(
      game,
      rosters,
      strategy,
      varietyFactors,
      {
        temperature: options.temperature,
        maxRetries: options.maxRetries,
      }
    )
  }

  /**
   * Get strategy configuration
   */
  private getStrategy(strategyName?: string): StrategyConfig {
    const strategies: Record<string, StrategyConfig> = {
      conservative: {
        name: 'Conservative Value',
        description: 'Focus on safer bets with higher probability',
        temperature: 0.3,
        focusAreas: ['proven_trends', 'historical_data', 'safe_props'],
        riskLevel: 'conservative',
      },
      balanced: {
        name: 'Balanced Approach',
        description: 'Mix of safe and value bets with moderate risk',
        temperature: 0.5,
        focusAreas: ['recent_form', 'matchup_analysis', 'value_props'],
        riskLevel: 'moderate',
      },
      aggressive: {
        name: 'High Upside',
        description: 'Higher risk selections targeting maximum payout',
        temperature: 0.7,
        focusAreas: ['breakout_potential', 'contrarian_plays', 'high_odds'],
        riskLevel: 'aggressive',
      },
      contrarian: {
        name: 'Contrarian Play',
        description: 'Go against public consensus and popular picks',
        temperature: 0.6,
        focusAreas: ['public_fade', 'contrarian_logic', 'value_spots'],
        riskLevel: 'moderate',
      },
      value_hunting: {
        name: 'Value Hunter',
        description: 'Find the best odds and expected value opportunities',
        temperature: 0.4,
        focusAreas: ['line_shopping', 'value_identification', 'expected_value'],
        riskLevel: 'moderate',
      },
    }

    return strategies[strategyName || 'balanced'] || strategies.balanced
  }

  /**
   * Generate variety factors for parlay generation
   */
  private generateVarietyFactors(
    rosters: GameRosters,
    overrides?: Partial<VarietyFactors>
  ): VarietyFactors {
    const strategies = [
      'conservative',
      'balanced',
      'aggressive',
      'contrarian',
      'value_hunting',
    ]
    const gameScripts = ['high_scoring', 'defensive', 'blowout', 'close_game']
    const focusAreas = ['offense', 'defense', 'special_teams', 'balanced']

    // Get eligible players for focus
    const allPlayers = [...rosters.homeRoster, ...rosters.awayRoster]
    const eligiblePlayers = allPlayers.filter(p =>
      ['QB', 'RB', 'WR', 'TE'].includes(p.position.abbreviation)
    )

    const baseFactors = {
      strategy: strategies[Math.floor(Math.random() * strategies.length)],
      focusArea: focusAreas[Math.floor(Math.random() * focusAreas.length)],
      gameScript: gameScripts[Math.floor(Math.random() * gameScripts.length)],
      focusPlayer:
        eligiblePlayers.length > 0
          ? eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)]
          : null,
      riskTolerance: Math.random() * 0.6 + 0.4, // 0.4 to 1.0
    }

    // Apply overrides
    return { ...baseFactors, ...overrides } as VarietyFactors
  }

  /**
   * Determine if we should try fallback providers
   */
  private shouldTryFallback(error: any, options: GenerationOptions): boolean {
    // Don't try fallback for configuration errors or non-retryable errors
    if (error instanceof CloudFunctionError) {
      const nonRetryableCodes = [
        'INVALID_INPUT',
        'MISSING_API_KEY',
        'INVALID_REQUEST',
      ]
      return !nonRetryableCodes.includes(error.code)
    }

    // Try fallback for network errors, rate limits, etc.
    return options.maxRetries !== 0 // Allow opting out of fallbacks
  }

  /**
   * Try fallback providers when primary fails
   */
  private async tryFallbackProviders(
    game: NFLGame,
    rosters: GameRosters,
    options: GenerationOptions,
    excludeProviders: AIProviderType[]
  ): Promise<GeneratedParlay> {
    const availableProviders = Array.from(this.providers.keys()).filter(
      provider => !excludeProviders.includes(provider)
    )

    if (availableProviders.length === 0) {
      throw new CloudFunctionError(
        'ALL_PROVIDERS_FAILED',
        'All configured AI providers failed to generate parlay'
      )
    }

    // Try the next available provider
    const fallbackProvider = availableProviders[0]
    console.log(`Trying fallback provider: ${fallbackProvider}`)

    try {
      return await this.generateParlay(game, rosters, {
        ...options,
        provider: fallbackProvider,
        maxRetries: 1, // Reduce retries for fallback
      })
    } catch (error) {
      // If fallback also fails, try the next one
      return this.tryFallbackProviders(game, rosters, options, [
        ...excludeProviders,
        fallbackProvider,
      ])
    }
  }
}
