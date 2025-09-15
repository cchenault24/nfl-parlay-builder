import {
  GameRosters,
  GeneratedParlay,
  NFLGame,
  StrategyConfig,
  VarietyFactors,
} from '../../types'

/**
 * Enhanced context for parlay generation that prevents template behavior
 */
export interface ParlayGenerationContext {
  strategy: StrategyConfig
  varietyFactors: VarietyFactors
  gameContext: GameContext
  antiTemplateHints: AntiTemplateHints
  temperature?: number
}

/**
 * Game-specific context that should influence bet selection
 */
export interface GameContext {
  weather?: {
    condition: 'indoor' | 'clear' | 'rain' | 'snow' | 'wind'
    temperature?: number
    windSpeed?: number
  }
  injuries: PlayerInjury[]
  restDays: {
    home: number
    away: number
  }
  isRivalry: boolean
  isPlayoffs: boolean
  isPrimeTime: boolean
  venue: {
    type: 'dome' | 'outdoor'
    surface: 'grass' | 'turf'
  }
  publicBetting?: {
    spreadConsensus: number // % on favorite
    totalConsensus: number // % on over
  }
}

/**
 * Hints to prevent AI from falling into template patterns
 */
export interface AntiTemplateHints {
  recentBetTypes: string[] // Recently used bet type combinations
  contextualFactors: string[] // Game-specific factors to emphasize
  avoidPatterns: string[] // Specific patterns to avoid
  emphasizeUnique: string[] // Unique aspects of this game
}

/**
 * Player injury information that should influence prop selection
 */
export interface PlayerInjury {
  playerId: string
  playerName: string
  position: string
  team: string
  injuryType: string
  status: 'out' | 'doubtful' | 'questionable' | 'probable'
  bodyPart: string
}

/**
 * Configuration options for AI generation
 */
export interface GenerationOptions {
  provider?: string
  temperature?: number
  maxRetries?: number
  strategy?: string
  debugMode?: boolean
}

/**
 * Standard response format that all AI providers must return
 */
export interface AIProviderResponse {
  parlay: GeneratedParlay
  metadata: {
    provider: string
    model: string
    tokens?: number
    latency: number
    confidence: number
  }
}

/**
 * Abstract base class that all AI providers must implement
 * This ensures consistency across OpenAI, Anthropic, Google, etc.
 */
export abstract class BaseParlayProvider {
  protected readonly providerName: string
  protected readonly maxRetries: number
  protected readonly baseDelay: number

  constructor(providerName: string, maxRetries = 3, baseDelay = 1000) {
    this.providerName = providerName
    this.maxRetries = maxRetries
    this.baseDelay = baseDelay
  }

  /**
   * Main method that all providers must implement
   * This is called by the ParlayAIService
   */
  abstract generateParlay(
    game: NFLGame,
    rosters: GameRosters,
    context: ParlayGenerationContext
  ): Promise<AIProviderResponse>

  /**
   * Validate that the provider is properly configured
   */
  abstract validateConnection(): Promise<boolean>

  /**
   * Get provider-specific model information
   */
  abstract getModelInfo(): {
    name: string
    version: string
    capabilities: string[]
  }

  /**
   * Common retry logic that all providers can use
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: any

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        console.warn(
          `${this.providerName} attempt ${attempt} failed${context ? ` (${context})` : ''}:`,
          error
        )

        // Don't retry on certain errors (auth, validation, etc.)
        if (this.shouldNotRetry(error)) {
          throw error
        }

        // Wait before retry with exponential backoff
        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError
  }

  /**
   * Determine if an error should not be retried
   * Override in specific providers for provider-specific error handling
   */
  protected shouldNotRetry(error: any): boolean {
    // Common non-retryable errors
    if (error.status === 401 || error.status === 403) return true // Auth errors
    if (error.status === 400) return true // Bad request
    if (
      error.message?.includes('invalid') ||
      error.message?.includes('malformed')
    )
      return true

    return false
  }

  /**
   * Common validation for parlay inputs
   */
  protected validateInputs(
    game: NFLGame,
    rosters: GameRosters,
    context: ParlayGenerationContext
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
   * Calculate standard parlay odds from individual leg odds
   */
  protected calculateParlayOdds(individualOdds: string[]): string {
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
  protected generateParlayId(): string {
    return `parlay-${this.providerName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
