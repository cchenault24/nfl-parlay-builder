// ================================================================================================
// OPENAI PROVIDER - OpenAI implementation of IAIProvider interface
// ================================================================================================

import OpenAI from 'openai'
import {
  GameRosters,
  GeneratedParlay,
  NFLGame,
  StrategyConfig,
} from '../../../types/domain'
import {
  AIGenerationContext,
  AIProviderConfig,
  AIProviderMetadata,
  AIProviderResponse,
  IAIProvider,
  ProviderHealth,
} from '../../../types/providers'

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements IAIProvider {
  public readonly metadata: AIProviderMetadata
  public readonly config: AIProviderConfig
  private openai: OpenAI | null
  private health: ProviderHealth
  private initialized: boolean = false

  constructor(config: AIProviderConfig) {
    this.config = {
      ...config,
      name: config.name || 'openai',
      enabled: config.enabled !== undefined ? config.enabled : true,
      priority: config.priority || 1,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      model: config.model || 'gpt-4o-mini',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4000,
    }

    this.metadata = {
      name: 'OpenAI',
      version: this.config.model,
      type: 'ai',
      capabilities: [
        'chat_completion',
        'json_mode',
        'temperature_control',
        'token_usage_tracking',
        'streaming',
      ],
      supportedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
      maxTokens: 128000,
      supportsStreaming: true,
      supportsJsonMode: true,
      costPerRequest: 0.0005, // Approximate cost per 1K tokens
    }

    this.health = {
      name: this.config.name,
      healthy: false,
      lastChecked: new Date(),
      uptime: 0,
    }

    // OpenAI will be initialized on first use
    this.openai = null
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Initialize OpenAI client
      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
        organization: this.config.organization,
        baseURL: this.config.baseURL,
      })

      // Validate connection
      await this.validateConnection()
      this.initialized = true
      this.updateHealth(true)
    } catch (error) {
      this.updateHealth(
        false,
        undefined,
        error instanceof Error ? error.message : 'Initialization failed'
      )
      throw error
    }
  }

  /**
   * Validate provider connection
   */
  async validateConnection(): Promise<boolean> {
    if (!this.openai) {
      return false
    }

    try {
      await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 1,
      })
      return true
    } catch (error) {
      console.warn('OpenAI connection validation failed:', error)
      return false
    }
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

    // Recreate client if core settings changed
    if (config.apiKey || config.organization || config.baseURL) {
      // Will be recreated on next initialize call
      this.initialized = false
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    this.initialized = false
    this.updateHealth(false)
  }

  /**
   * Generate a parlay using OpenAI
   */
  async generateParlay(
    game: NFLGame,
    rosters: GameRosters,
    context: AIGenerationContext
  ): Promise<AIProviderResponse> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.openai) {
      throw new Error('OpenAI client not initialized')
    }

    const startTime = Date.now()

    try {
      // Validate inputs
      this.validateInputs(game, rosters, context)

      // Create prompts
      const systemPrompt = this.createSystemPrompt(context.strategy, context)
      const userPrompt = this.createParlayPrompt(game, rosters, context)

      // Determine temperature
      const temperature = context.temperature ?? this.config.temperature

      // Call OpenAI with retry logic
      const response = await this.withRetry(
        () =>
          this.openai!.chat.completions.create({
            model: this.config.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature,
            max_tokens: context.maxTokens ?? this.config.maxTokens,
            top_p: 0.9,
            frequency_penalty: 0.3,
            presence_penalty: 0.4,
            seed: Math.floor(Math.random() * 1000000),
          }),
        'OpenAI parlay generation'
      )

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response content from OpenAI')
      }

      // Parse and validate response
      const parlay = this.parseAIResponse(content, game, context)
      const latency = Date.now() - startTime
      const cost = this.estimateCost(context)

      this.updateHealth(true, latency)

      return {
        parlay,
        metadata: {
          provider: this.config.name,
          model: this.config.model,
          tokens: response.usage?.total_tokens,
          latency,
          confidence: parlay.overallConfidence,
          cost,
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
    // Rough estimation based on context complexity
    const baseTokens = 1000
    const contextTokens = this.estimateContextTokens(context)
    const totalTokens =
      baseTokens + contextTokens + (context.maxTokens ?? this.config.maxTokens)

    return (totalTokens / 1000) * (this.metadata.costPerRequest || 0.0005)
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
   * Retry logic with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: any

    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        console.warn(
          `${this.config.name} attempt ${attempt} failed${context ? ` (${context})` : ''}:`,
          error
        )

        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error
        }

        // Wait before retry with exponential backoff
        if (attempt < this.config.retries) {
          const delay = 1000 * Math.pow(2, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError
  }

  /**
   * Determine if an error should not be retried
   */
  private shouldNotRetry(error: any): boolean {
    // Check for OpenAI API error structure
    if (error && typeof error === 'object' && error.status) {
      // Don't retry on authentication or bad request errors
      if (
        error.status === 401 ||
        error.status === 403 ||
        error.status === 400
      ) {
        return true
      }

      // Don't retry on insufficient quota
      if (error.status === 429 && error.message?.includes('quota')) {
        return true
      }
    }

    return false
  }

  /**
   * Create system prompt
   */
  private createSystemPrompt(
    strategy: StrategyConfig,
    context: AIGenerationContext
  ): string {
    const antiTemplateInstructions =
      context.antiTemplateHints.avoidPatterns.length > 0
        ? `\n\nAVOID these generic phrases: ${context.antiTemplateHints.avoidPatterns.join(', ')}`
        : ''

    const contextualFactors =
      context.antiTemplateHints.contextualFactors.length > 0
        ? `\n\nREQUIRED CONTEXT FACTORS: ${context.antiTemplateHints.contextualFactors.join(', ')}`
        : ''

    const uniqueEmphasis =
      context.antiTemplateHints.emphasizeUnique.length > 0
        ? `\n\nEMPHASIZE THESE UNIQUE ASPECTS: ${context.antiTemplateHints.emphasizeUnique.join(', ')}`
        : ''

    return `You are an expert NFL betting analyst specializing in creating winning parlays. Use your deep knowledge of football to create strategic, well-reasoned bets.

STRATEGY: ${strategy.name}
${strategy.description}

CORE INSTRUCTIONS:
1. Create EXACTLY 3 different bet types for a strategic parlay
2. Use current, real player names from the provided rosters ONLY
3. Provide detailed reasoning based on football analysis (matchups, trends, conditions)
4. Include confidence scores (1-10) for each leg
5. Ensure realistic odds for each bet type
6. Generate a comprehensive game summary

BET TYPES AVAILABLE:
- spread: Team point spread bets
- total: Over/under game totals  
- moneyline: Straight win/loss bets
- player_prop: Individual player performance (passing yards, rushing yards, receptions, etc.)

REASONING REQUIREMENTS:
- Focus on specific football factors (defensive matchups, offensive trends, weather impact)
- Cite relevant player/team statistics when possible
- Consider game context (rivalry, prime time, playoff implications)
- Avoid generic betting terminology - use football analysis

REQUIRED JSON FORMAT:
{
  "legs": [
    {
      "id": "leg-1",
      "betType": "spread|total|moneyline|player_prop",
      "selection": "Specific bet selection",
      "target": "Betting target/line",
      "reasoning": "Detailed football analysis and reasoning",
      "confidence": 1-10,
      "odds": "-110" 
    }
  ],
  "aiReasoning": "Overall parlay strategy and logic",
  "overallConfidence": 1-10,
  "estimatedOdds": "+250",
  "gameSummary": {
    "matchupAnalysis": "How team offenses match against opposing defenses",
    "gameFlow": "high_scoring_shootout|defensive_grind|balanced_tempo|potential_blowout",
    "keyFactors": ["factor1", "factor2", "factor3"],
    "prediction": "Game prediction with reasoning",
    "confidence": 1-10
  }
}

IMPORTANT: Only use players from the provided rosters. Make selections based on real football analysis.${antiTemplateInstructions}${contextualFactors}${uniqueEmphasis}`
  }

  /**
   * Create user prompt with game and roster data
   */
  private createParlayPrompt(
    game: NFLGame,
    rosters: GameRosters,
    context: AIGenerationContext
  ): string {
    // Format rosters for prompt
    const formatRoster = (players: any[]) => {
      const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

      return positions
        .map(pos => {
          const positionPlayers = players
            .filter(p => {
              const position = p.position
              if (typeof position === 'string') {
                return position === pos
              }
              return position?.abbreviation === pos
            })
            .slice(0, pos === 'WR' ? 6 : pos === 'RB' ? 3 : 2)

          if (positionPlayers.length === 0) return ''

          const playerList = positionPlayers
            .map(p => {
              const name = p.displayName || p.fullName || 'Unknown'
              const jersey = p.jerseyNumber || p.jersey || '??'
              return `${name} (#${jersey})`
            })
            .join(', ')

          return `${pos}: ${playerList}`
        })
        .filter(Boolean)
        .join('\n')
    }

    // Build game context
    let gameContextInfo = ''
    if (
      context.gameContext.weather &&
      context.gameContext.weather.condition !== 'clear'
    ) {
      gameContextInfo += `\nWeather: ${context.gameContext.weather.condition}`
      if (context.gameContext.weather.temperature) {
        gameContextInfo += ` (${context.gameContext.weather.temperature}°F)`
      }
    }

    if (context.gameContext.isRivalry) {
      gameContextInfo += '\nContext: Divisional rivalry game'
    }

    if (context.gameContext.isPrimeTime) {
      gameContextInfo += '\nContext: Prime time national television game'
    }

    if (
      context.gameContext.restDays.home !== context.gameContext.restDays.away
    ) {
      gameContextInfo += `\nRest: Home ${context.gameContext.restDays.home} days, Away ${context.gameContext.restDays.away} days`
    }

    // Build variety factors info
    const varietyInfo = context.varietyFactors
      ? `
FOCUS AREAS:
- Strategy: ${context.varietyFactors.strategy}
- Game Script: ${context.varietyFactors.gameScript}
- Risk Tolerance: ${(context.varietyFactors.riskTolerance * 100).toFixed(0)}%${
          context.varietyFactors.focusPlayer
            ? `\n- Focus Player: ${context.varietyFactors.focusPlayer.displayName || context.varietyFactors.focusPlayer.fullName} (${context.varietyFactors.focusPlayer.position?.abbreviation || context.varietyFactors.focusPlayer.position})`
            : ''
        }`
      : ''

    return `GAME: ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}
Week ${game.week} | Date: ${game.date}${gameContextInfo}

${game.homeTeam.displayName.toUpperCase()} ROSTER:
${formatRoster(rosters.homeRoster)}

${game.awayTeam.displayName.toUpperCase()} ROSTER:
${formatRoster(rosters.awayRoster)}${varietyInfo}

Generate a strategic 3-leg parlay with detailed football analysis and comprehensive game summary.`
  }

  /**
   * Parse AI response into GeneratedParlay format
   */
  private parseAIResponse(
    response: string,
    game: NFLGame,
    context: AIGenerationContext
  ): GeneratedParlay {
    try {
      const parsed = JSON.parse(response)

      // Validate structure
      if (
        !parsed.legs ||
        !Array.isArray(parsed.legs) ||
        parsed.legs.length !== 3
      ) {
        throw new Error('AI response must contain exactly 3 legs')
      }

      // Process legs
      const validatedLegs = this.processLegData(parsed.legs)

      // Calculate parlay odds if not provided
      const individualOdds = validatedLegs.map(leg => leg.odds)
      const calculatedOdds = this.calculateParlayOdds(individualOdds)

      // Process game summary
      const gameSummary = this.processGameSummary(parsed.gameSummary, game)

      const parlay: GeneratedParlay = {
        id: this.generateParlayId(),
        legs: validatedLegs as [any, any, any], // Type assertion for now
        gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - Week ${game.week}`,
        aiReasoning:
          parsed.aiReasoning ||
          `Generated using ${context.strategy.name} approach`,
        overallConfidence: Math.min(
          Math.max(parsed.overallConfidence || 6, 1),
          10
        ),
        estimatedOdds: parsed.estimatedOdds || calculatedOdds,
        createdAt: new Date().toISOString(),
        gameSummary: gameSummary || {
          matchupAnalysis: `${game.awayTeam.displayName} vs ${game.homeTeam.displayName} matchup analysis.`,
          gameFlow: 'balanced_tempo',
          keyFactors: [
            'Team matchups',
            'Key player availability',
            'Game conditions',
          ],
          prediction: 'Competitive game expected between these two teams.',
          confidence: 6,
        },
      }

      return parlay
    } catch (error) {
      console.error('Error parsing AI response:', error)
      throw new Error(
        `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Process and validate leg data
   */
  private processLegData(legs: any[]): any[] {
    return legs.map((leg: any, index: number) => {
      const validBetTypes = ['spread', 'total', 'moneyline', 'player_prop']
      const betType = validBetTypes.includes(leg.betType)
        ? leg.betType
        : 'spread'

      return {
        id: leg.id || `leg-${index + 1}`,
        betType,
        selection: String(leg.selection || 'Unknown Selection'),
        target: String(leg.target || 'TBD'),
        reasoning: String(
          leg.reasoning || 'Strategic selection based on analysis'
        ),
        confidence: Math.min(Math.max(Number(leg.confidence) || 5, 1), 10),
        odds: String(leg.odds || '-110'),
      }
    })
  }

  /**
   * Process game summary data
   */
  private processGameSummary(gameSummary: any, game: NFLGame): any {
    if (!gameSummary || typeof gameSummary !== 'object') {
      return undefined
    }

    const validGameFlows = [
      'high_scoring_shootout',
      'defensive_grind',
      'balanced_tempo',
      'potential_blowout',
    ]

    return {
      matchupAnalysis: String(
        gameSummary.matchupAnalysis ||
          `${game.awayTeam.displayName} vs ${game.homeTeam.displayName} matchup analysis.`
      ),
      gameFlow: validGameFlows.includes(gameSummary.gameFlow)
        ? gameSummary.gameFlow
        : 'balanced_tempo',
      keyFactors: Array.isArray(gameSummary.keyFactors)
        ? gameSummary.keyFactors.map(String).slice(0, 5)
        : ['Team matchups', 'Key player availability', 'Game conditions'],
      prediction: String(
        gameSummary.prediction ||
          'Competitive game expected between these two teams.'
      ),
      confidence: Math.min(
        Math.max(Number(gameSummary.confidence) || 6, 1),
        10
      ),
    }
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
   * Estimate context tokens
   */
  private estimateContextTokens(context: AIGenerationContext): number {
    // Rough estimation based on context complexity
    let tokens = 500 // Base context

    if (context.gameContext.weather) tokens += 50
    if (context.gameContext.injuries.length > 0)
      tokens += context.gameContext.injuries.length * 20
    if (context.antiTemplateHints.avoidPatterns.length > 0) tokens += 100
    if (context.antiTemplateHints.contextualFactors.length > 0) tokens += 100

    return tokens
  }
}

export default OpenAIProvider
