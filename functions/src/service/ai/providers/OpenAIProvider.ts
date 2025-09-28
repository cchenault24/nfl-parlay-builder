import OpenAI from 'openai'
import {
  GameRosters,
  GameSummary,
  GeneratedParlay,
  NFLGame,
  NFLPlayer,
  ParlayLeg,
  StrategyConfig,
} from '../../../types'
import {
  AIProviderResponse,
  BaseParlayProvider,
  ParlayGenerationContext,
} from '../BaseParlayProvider'

/**
 * OpenAI-specific configuration options
 */
export interface OpenAIConfig {
  apiKey: string
  model?: string
  baseURL?: string
  organization?: string
  defaultTemperature?: number
  defaultMaxTokens?: number
}

/**
 * OpenAI provider implementation for parlay generation
 * Extends BaseParlayProvider to ensure consistency across providers
 */
export class OpenAIProvider extends BaseParlayProvider {
  private openai: OpenAI
  private config: Required<Omit<OpenAIConfig, 'organization' | 'baseURL'>> & {
    organization?: string
    baseURL?: string
  }

  constructor(config: OpenAIConfig) {
    super('openai', 3, 1000)

    if (!config.apiKey) {
      throw new Error('OpenAI API key is required')
    }

    // Set default configuration
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'gpt-4o-mini',
      organization: config.organization,
      baseURL: config.baseURL,
      defaultTemperature: config.defaultTemperature || 0.7,
      defaultMaxTokens: config.defaultMaxTokens || 4000,
    }

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: this.config.apiKey,
      organization: this.config.organization,
      baseURL: this.config.baseURL,
    })
  }

  /**
   * Generate a parlay using OpenAI
   */
  async generateParlay(
    game: NFLGame,
    rosters: GameRosters,
    context: ParlayGenerationContext
  ): Promise<AIProviderResponse> {
    const startTime = Date.now()

    // Validate inputs using base class method
    this.validateInputs(game, rosters, context)

    try {
      // Create prompts
      const systemPrompt = this.createSystemPrompt(context.strategy, context)
      const userPrompt = this.createParlayPrompt(game, rosters, context)

      // Determine temperature
      const temperature =
        context.temperature ?? context.strategy.temperature * 0.8

      // Call OpenAI with retry logic
      const response = await this.withRetry(
        () =>
          this.callOpenAI({
            model: this.config.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature,
            max_tokens: this.config.defaultMaxTokens,
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

      return {
        parlay,
        metadata: {
          provider: this.providerName,
          model: this.config.model,
          tokens: response.usage?.total_tokens,
          latency,
          confidence: parlay.overallConfidence,
        },
      }
    } catch (error) {
      // Transform OpenAI errors into standard format
      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API error (${error.status}): ${error.message}`)
      }

      throw error
    }
  }

  /**
   * Validate OpenAI connection
   */
  async validateConnection(): Promise<boolean> {
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
   * Get OpenAI model information
   */
  getModelInfo(): {
    name: string
    version: string
    capabilities: string[]
  } {
    return {
      name: 'OpenAI',
      version: this.config.model,
      capabilities: [
        'chat_completion',
        'json_mode',
        'temperature_control',
        'token_usage_tracking',
        'streaming',
      ],
    }
  }

  /**
   * Update OpenAI configuration
   */
  updateConfig(newConfig: Partial<OpenAIConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Recreate client if core settings changed
    if (newConfig.apiKey || newConfig.organization || newConfig.baseURL) {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
        organization: this.config.organization,
        baseURL: this.config.baseURL,
      })
    }
  }

  /**
   * Override shouldNotRetry for OpenAI-specific error handling
   */
  protected shouldNotRetry(error: any): boolean {
    // Call parent method first
    if (super.shouldNotRetry(error)) {
      return true
    }

    // OpenAI-specific non-retryable errors
    if (error instanceof OpenAI.APIError) {
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

  // ===== PRIVATE METHODS =====

  /**
   * Call OpenAI API
   */
  private async callOpenAI(
    request: OpenAI.Chat.ChatCompletionCreateParams
  ): Promise<OpenAI.Chat.ChatCompletion> {
    const response = await this.openai.chat.completions.create(request)

    // Ensure we have a non-streaming response
    if ('stream' in request && request.stream) {
      throw new Error(
        'Streaming responses are not supported in this implementation'
      )
    }

    return response as OpenAI.Chat.ChatCompletion
  }

  /**
   * Create system prompt with context-aware instructions
   */
  private createSystemPrompt(
    strategy: StrategyConfig,
    context: ParlayGenerationContext
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
    context: ParlayGenerationContext
  ): string {
    // Format rosters for prompt
    const formatRoster = (players: NFLPlayer[], teamName: string) => {
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
              const jersey = p.jersey || '??'
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
${formatRoster(rosters.homeRoster, game.homeTeam.displayName)}

${game.awayTeam.displayName.toUpperCase()} ROSTER:
${formatRoster(rosters.awayRoster, game.awayTeam.displayName)}${varietyInfo}

Generate a strategic 3-leg parlay with detailed football analysis and comprehensive game summary.`
  }

  /**
   * Parse AI response into GeneratedParlay format
   */
  private parseAIResponse(
    response: string,
    game: NFLGame,
    context: ParlayGenerationContext
  ): GeneratedParlay {
    try {
      // Clean the response text to handle special characters and formatting
      const cleanedResponse = this.cleanAIResponse(response)
      const parsed = JSON.parse(cleanedResponse)

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
        legs: validatedLegs as [ParlayLeg, ParlayLeg, ParlayLeg],
        gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - Week ${game.week}`,
        aiReasoning: this.cleanText(
          parsed.aiReasoning ||
            `Generated using ${context.strategy.name} approach`
        ),
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
  private processLegData(legs: any[]): ParlayLeg[] {
    return legs.map((leg: any, index: number) => {
      // Validate bet type
      const validBetTypes = ['spread', 'total', 'moneyline', 'player_prop']
      const betType = validBetTypes.includes(leg.betType)
        ? leg.betType
        : 'spread'

      return {
        id: leg.id || `leg-${index + 1}`,
        betType,
        selection: this.cleanText(leg.selection || 'Unknown Selection'),
        target: this.cleanText(leg.target || 'TBD'),
        reasoning: this.cleanText(
          leg.reasoning || 'Strategic selection based on analysis'
        ),
        confidence: Math.min(Math.max(Number(leg.confidence) || 5, 1), 10),
        odds: this.cleanText(leg.odds || '-110'),
      }
    })
  }

  /**
   * Clean AI response text to handle special characters and formatting
   */
  private cleanAIResponse(response: string): string {
    return (
      response
        .trim()
        // Remove any markdown code blocks
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        // Remove any leading/trailing whitespace and newlines
        .replace(/^\s+|\s+$/g, '')
        // Replace any non-printable characters except newlines and tabs
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Normalize quotes to standard quotes
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        // Remove any BOM or other Unicode markers
        .replace(/^\uFEFF/, '')
    )
  }

  /**
   * Clean text content to remove special characters and normalize formatting
   */
  private cleanText(text: string | number | null | undefined): string {
    if (!text) return ''

    return (
      String(text)
        .trim()
        // Remove any non-printable characters except spaces, newlines, and tabs
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Normalize quotes
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        // Remove any BOM or other Unicode markers
        .replace(/^\uFEFF/, '')
        // Clean up multiple spaces
        .replace(/\s+/g, ' ')
        // Remove any remaining control characters
        .replace(/[\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, ' ')
    )
  }

  /**
   * Process game summary data
   */
  private processGameSummary(
    gameSummary: any,
    game: NFLGame
  ): GameSummary | undefined {
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
      matchupAnalysis: this.cleanText(
        gameSummary.matchupAnalysis ||
          `${game.awayTeam.displayName} vs ${game.homeTeam.displayName} matchup analysis.`
      ),
      gameFlow: validGameFlows.includes(gameSummary.gameFlow)
        ? gameSummary.gameFlow
        : 'balanced_tempo',
      keyFactors: Array.isArray(gameSummary.keyFactors)
        ? gameSummary.keyFactors
            .map(factor => this.cleanText(factor))
            .slice(0, 5)
        : ['Team matchups', 'Key player availability', 'Game conditions'],
      prediction: this.cleanText(
        gameSummary.prediction ||
          'Competitive game expected between these two teams.'
      ),
      confidence: Math.min(
        Math.max(Number(gameSummary.confidence) || 6, 1),
        10
      ),
    }
  }
}

export default OpenAIProvider
