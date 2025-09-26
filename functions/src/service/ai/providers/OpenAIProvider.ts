// functions/src/service/ai/providers/OpenAIProvider.ts
import OpenAI from 'openai'
import {
  GameRosters,
  GameSummary,
  GeneratedParlay,
  NFLGame,
  NFLPlayer,
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

      // FIXED: Safely determine temperature with proper null checks
      const temperature =
        context.temperature ??
        (context.strategy.temperature
          ? context.strategy.temperature * 0.8
          : this.config.defaultTemperature)

      console.log('🤖 OpenAI: Making API call', {
        model: this.config.model,
        temperature,
        gameId: game.id,
      })

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

      console.log('🤖 OpenAI: Received response, parsing...')

      // Parse and validate response
      const parlay = this.parseAIResponse(content, game, context)
      const latency = Date.now() - startTime

      console.log('✅ OpenAI: Successfully generated parlay', {
        hasGameSummary: !!parlay.gameSummary,
        overallConfidence: parlay.overallConfidence,
        latency: `${latency}ms`,
      })

      return {
        parlay,
        metadata: {
          provider: this.providerName,
          model: this.config.model,
          tokens: response.usage?.total_tokens,
          latency,
          confidence: parlay.overallConfidence || 7, // FIXED: Provide fallback for undefined
        },
      }
    } catch (error) {
      console.error('❌ OpenAI: Error generating parlay:', error)

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
    const strategyDescription =
      strategy.description || 'Balanced parlay strategy'

    return `You are an expert NFL betting analyst specializing in creating winning parlays.

STRATEGY: ${strategy.name}
APPROACH: ${strategyDescription}

Generate exactly 3 parlay legs with comprehensive game analysis.

REQUIRED JSON FORMAT:
{
  "legs": [
    {
      "id": "leg-1",
      "betType": "spread|total|moneyline|player_prop",
      "selection": "Specific bet selection",
      "target": "Betting target/line",
      "reasoning": "Detailed football analysis",
      "confidence": 7,
      "odds": "-110"
    }
  ],
  "aiReasoning": "Overall parlay strategy and logic",
  "overallConfidence": 7,
  "estimatedOdds": "+280",
  "gameSummary": {
    "matchupAnalysis": "Detailed team matchup analysis",
    "gameFlow": "balanced_tempo",
    "keyFactors": ["factor1", "factor2", "factor3"],
    "prediction": "Game prediction with reasoning",
    "confidence": 7
  }
}

Use only players from the provided rosters. Focus on real football analysis.`
  }

  /**
   * Create user prompt with game and roster data
   */
  private createParlayPrompt(
    game: NFLGame,
    rosters: GameRosters,
    context: ParlayGenerationContext
  ): string {
    // FIXED: Safely access roster arrays with proper fallbacks
    const homeRoster = rosters.home || rosters.homeRoster || []
    const awayRoster = rosters.away || rosters.awayRoster || []

    const formatRoster = (players: NFLPlayer[], teamName: string) => {
      const positions = ['QB', 'RB', 'WR', 'TE']

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
            .slice(0, pos === 'WR' ? 4 : 2)

          if (positionPlayers.length === 0) return ''

          const playerList = positionPlayers
            .map(p => {
              const name = p.displayName || p.fullName || 'Unknown'
              const jersey = p.jersey || '??'
              return `#${jersey} ${name}`
            })
            .join(', ')

          return `${pos}: ${playerList}`
        })
        .filter(Boolean)
        .join('\n')
    }

    // FIXED: Safely access riskTolerance with fallback
    const riskTolerance = context.varietyFactors.riskTolerance || 0.5

    return `Generate a 3-leg parlay for this NFL game:

GAME: ${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - Week ${game.week}

ROSTERS:
${game.homeTeam.displayName}:
${formatRoster(homeRoster, game.homeTeam.displayName)}

${game.awayTeam.displayName}:
${formatRoster(awayRoster, game.awayTeam.displayName)}

STRATEGY CONTEXT:
- Risk Tolerance: ${riskTolerance}
- Focus: ${context.varietyFactors.focusArea || 'balanced'}

Create a strategic parlay with exactly 3 legs, including comprehensive game analysis.`
  }

  /**
   * Parse AI response with proper error handling
   */
  private parseAIResponse(
    content: string,
    game: NFLGame,
    context: ParlayGenerationContext
  ): GeneratedParlay {
    try {
      const parsed = JSON.parse(content)

      if (!parsed.legs || !Array.isArray(parsed.legs)) {
        throw new Error('Response must include legs array')
      }

      if (parsed.legs.length !== 3) {
        throw new Error('Response must include exactly 3 legs')
      }

      // FIXED: Create legs array that matches GeneratedParlay.legs structure
      const legs = parsed.legs.map((leg: any) => ({
        type: leg.betType || leg.type,
        selection: leg.selection,
        threshold: parseFloat(leg.target) || undefined,
        price: parseInt(leg.odds) || undefined,
        rationale: leg.reasoning || leg.rationale,
      }))

      // Create the parlay with all required fields
      const parlay: GeneratedParlay = {
        gameId: game.id,
        legs, // FIXED: Use properly structured legs array
        notes:
          parsed.notes ||
          `AI-generated parlay for ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`,

        // Extended fields
        id: this.generateParlayId(),
        gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - Week ${game.week}`,
        aiReasoning:
          parsed.aiReasoning ||
          'Strategic parlay selection based on game analysis.',
        overallConfidence: Math.min(
          Math.max(Number(parsed.overallConfidence) || 7, 1),
          10
        ),
        estimatedOdds: parsed.estimatedOdds || '+280',
        gameSummary: this.processGameSummary(parsed.gameSummary, game),
        createdAt: new Date().toISOString(),
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
   * Process game summary with proper typing
   */
  private processGameSummary(gameSummary: any, game: NFLGame): GameSummary {
    if (!gameSummary || typeof gameSummary !== 'object') {
      // Return default GameSummary
      return {
        matchupAnalysis: `${game.awayTeam.displayName} vs ${game.homeTeam.displayName} presents an intriguing matchup with both teams bringing unique strengths and tactical approaches.`,
        gameFlow: 'balanced_tempo',
        keyFactors: [
          'Team strengths and weaknesses',
          'Key matchup advantages',
          'Game conditions and context',
        ],
        prediction:
          'Expect a competitive game with strategic adjustments throughout, likely decided by execution in key moments.',
        confidence: 7,
      }
    }

    const validGameFlows: GameSummary['gameFlow'][] = [
      'high_scoring_shootout',
      'defensive_grind',
      'balanced_tempo',
      'potential_blowout',
    ]

    // Safely process key factors
    const processKeyFactors = (factors: any): string[] => {
      if (Array.isArray(factors)) {
        return factors
          .map(factor => String(factor).trim())
          .filter(factor => factor.length > 0)
          .slice(0, 5) // Limit to 5 factors
      }

      if (typeof factors === 'string') {
        return [factors.trim()].filter(factor => factor.length > 0)
      }

      // Default fallback
      return [
        'Team matchups and strengths',
        'Key player availability',
        'Game conditions and context',
      ]
    }

    return {
      matchupAnalysis: String(
        gameSummary.matchupAnalysis ||
          `${game.awayTeam.displayName} vs ${game.homeTeam.displayName} presents an intriguing matchup with contrasting styles.`
      ),
      gameFlow: validGameFlows.includes(gameSummary.gameFlow)
        ? gameSummary.gameFlow
        : 'balanced_tempo',
      keyFactors: processKeyFactors(gameSummary.keyFactors),
      prediction: String(
        gameSummary.prediction ||
          'Competitive game expected with strategic adjustments from both teams throughout.'
      ),
      confidence: Math.min(
        Math.max(Number(gameSummary.confidence) || 7, 1),
        10
      ),
    }
  }
}

export default OpenAIProvider
