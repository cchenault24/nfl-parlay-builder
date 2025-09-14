import OpenAI from 'openai'
import {
  CloudFunctionError,
  GameRosters,
  GameSummary,
  GeneratedParlay,
  NFLGame,
  NFLPlayer,
  OpenAIRequest,
  ParlayLeg,
  StrategyConfig,
  VarietyFactors,
} from '../types'

/**
 * OpenAI Service for Firebase Cloud Functions
 * Handles all OpenAI API interactions securely on the server side
 */
export class OpenAIService {
  private openai: OpenAI
  private readonly maxRetries = 3
  private readonly baseDelay = 1000 // 1 second

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new CloudFunctionError(
        'MISSING_API_KEY',
        'OpenAI API key is required'
      )
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    })
  }

  /**
   * Generate a parlay using OpenAI
   */
  async generateParlay(
    game: NFLGame,
    rosters: GameRosters,
    options: { temperature?: number; strategy?: string } = {}
  ): Promise<GeneratedParlay> {
    try {
      // Validate inputs
      this.validateParlayInputs(game, rosters)

      // Generate variety factors and strategy
      const varietyFactors = this.generateVarietyFactors(rosters)
      const strategy = this.getStrategy(
        options.strategy || varietyFactors.strategy
      )

      // Create prompts
      const systemPrompt = this.createSystemPrompt(strategy)
      const userPrompt = this.createParlayPrompt(game, rosters, varietyFactors)

      // Call OpenAI with retry logic
      const response = await this.callOpenAIWithRetry({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: options.temperature || strategy.temperature * 0.8,
        max_tokens: 4000,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.4,
        seed: Math.floor(Math.random() * 1000000),
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new CloudFunctionError(
          'NO_RESPONSE',
          'No response content from OpenAI'
        )
      }

      // Parse and validate response
      const parlay = this.parseAIResponse(
        content,
        game,
        varietyFactors,
        strategy
      )
      return parlay
    } catch (error) {
      console.error('Error generating parlay:', error)

      if (error instanceof CloudFunctionError) {
        throw error
      }

      // Handle OpenAI specific errors
      if (error instanceof OpenAI.APIError) {
        throw new CloudFunctionError(
          'OPENAI_ERROR',
          `OpenAI API error: ${error.message}`,
          { status: error.status, type: error.type }
        )
      }

      throw new CloudFunctionError(
        'GENERATION_FAILED',
        'Failed to generate parlay',
        error
      )
    }
  }

  /**
   * Validate connection to OpenAI
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 1,
      })
      return true
    } catch {
      return false
    }
  }

  // === Private Methods ===

  private async callOpenAIWithRetry(request: OpenAIRequest): Promise<any> {
    let lastError: any

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.openai.chat.completions.create(request)
        return response
      } catch (error) {
        lastError = error
        console.warn(`OpenAI attempt ${attempt} failed:`, error)

        // Don't retry on certain errors
        if (error instanceof OpenAI.APIError) {
          if (error.status === 401 || error.status === 400) {
            throw error
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1)
          await this.delay(delay)
        }
      }
    }

    throw lastError
  }

  private validateParlayInputs(game: NFLGame, rosters: GameRosters): void {
    if (!game?.id || !game?.homeTeam || !game?.awayTeam) {
      throw new CloudFunctionError('INVALID_GAME', 'Invalid game data provided')
    }

    if (!rosters?.homeRoster || !rosters?.awayRoster) {
      throw new CloudFunctionError(
        'INVALID_ROSTERS',
        'Invalid roster data provided'
      )
    }

    if (rosters.homeRoster.length === 0 || rosters.awayRoster.length === 0) {
      throw new CloudFunctionError(
        'INSUFFICIENT_ROSTER_DATA',
        'Insufficient roster data to generate parlay'
      )
    }
  }

  private generateVarietyFactors(rosters: GameRosters): VarietyFactors {
    const strategies = [
      'conservative',
      'balanced',
      'aggressive',
      'contrarian',
      'value_hunting',
    ]
    const gameScripts = [
      'shootout',
      'defensive_battle',
      'balanced',
      'blowout_potential',
    ]

    // Combine both rosters for player selection
    const allPlayers = [...rosters.homeRoster, ...rosters.awayRoster]
    const keyPositions = ['QB', 'RB', 'WR', 'TE']
    const eligiblePlayers = allPlayers.filter(p =>
      keyPositions.includes(p.position.abbreviation)
    )

    return {
      strategy: strategies[Math.floor(Math.random() * strategies.length)],
      focusPlayer:
        eligiblePlayers.length > 0
          ? eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)]
          : null,
      gameScript: gameScripts[Math.floor(Math.random() * gameScripts.length)],
      riskTolerance: Math.random() * 0.6 + 0.4, // 0.4 to 1.0
    }
  }

  private getStrategy(strategyName: string): StrategyConfig {
    const strategies: Record<string, StrategyConfig> = {
      conservative: {
        name: 'Conservative Value',
        description: 'Focus on safer bets with lower risk',
        temperature: 0.3,
        focusAreas: ['proven_trends', 'historical_data', 'safe_props'],
        riskLevel: 'conservative',
      },
      balanced: {
        name: 'Balanced Approach',
        description: 'Mix of safe and value bets',
        temperature: 0.5,
        focusAreas: ['recent_form', 'matchup_analysis', 'value_props'],
        riskLevel: 'moderate',
      },
      aggressive: {
        name: 'High Upside',
        description: 'Higher risk, higher reward selections',
        temperature: 0.7,
        focusAreas: ['breakout_potential', 'contrarian_plays', 'high_odds'],
        riskLevel: 'aggressive',
      },
      contrarian: {
        name: 'Contrarian Play',
        description: 'Go against public consensus',
        temperature: 0.6,
        focusAreas: ['public_fade', 'contrarian_logic', 'value_spots'],
        riskLevel: 'moderate',
      },
      value_hunting: {
        name: 'Value Hunter',
        description: 'Find the best odds and value',
        temperature: 0.4,
        focusAreas: ['line_shopping', 'value_identification', 'expected_value'],
        riskLevel: 'moderate',
      },
    }

    return strategies[strategyName] || strategies.balanced
  }

  private createSystemPrompt(strategy: StrategyConfig): string {
    return `You are an expert NFL betting analyst specializing in creating winning parlays.

STRATEGY: ${strategy.name}
${strategy.description}

Focus areas: ${strategy.focusAreas.join(', ')}
Risk level: ${strategy.riskLevel}

INSTRUCTIONS:
1. Create EXACTLY 3 different bet types for a strategic parlay
2. Use current, real player names from the provided rosters
3. Provide detailed reasoning for each selection
4. Include confidence scores (1-10) for each leg
5. Ensure realistic odds for each bet type
6. Generate a comprehensive game summary

BET TYPES TO USE:
- spread: Team point spread bets
- total: Over/under game totals
- moneyline: Straight win/loss bets  
- player_prop: Individual player performance (passing yards, rushing yards, receptions, etc.)

REQUIRED JSON FORMAT:
{
  "legs": [
    {
      "id": "leg-1",
      "betType": "spread|total|moneyline|player_prop",
      "selection": "Specific bet selection",
      "target": "Betting target/line",
      "reasoning": "Detailed analysis and reasoning",
      "confidence": 1-10,
      "odds": "-110" 
    }
  ],
  "aiReasoning": "Overall parlay strategy and logic",
  "overallConfidence": 1-10,
  "estimatedOdds": "+250",
  "gameSummary": {
    "matchupAnalysis": "Detailed game analysis",
    "gameFlow": "high_scoring_shootout|defensive_grind|balanced_tempo|potential_blowout",
    "keyFactors": ["factor1", "factor2", "factor3"],
    "prediction": "Game prediction",
    "confidence": 1-10
  }
}

IMPORTANT: Only use players from the provided rosters. Generate realistic, strategic bets.`
  }

  private createParlayPrompt(
    game: NFLGame,
    rosters: GameRosters,
    varietyFactors: VarietyFactors
  ): string {
    const formatRoster = (players: NFLPlayer[], teamName: string) => {
      const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

      return positions
        .map(pos => {
          const positionPlayers = players
            .filter(p => p.position.abbreviation === pos)
            .slice(0, pos === 'WR' ? 6 : pos === 'RB' ? 3 : 2)

          if (positionPlayers.length === 0) return ''

          const playerList = positionPlayers
            .map(p => `${p.fullName} (#${p.jersey})`)
            .join(', ')

          return `${pos}: ${playerList}`
        })
        .filter(Boolean)
        .join('\n')
    }

    return `GAME: ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}
Week ${game.week} | Date: ${game.date}

VARIETY FACTORS:
- Strategy: ${varietyFactors.strategy}
- Game Script: ${varietyFactors.gameScript}
- Risk Tolerance: ${(varietyFactors.riskTolerance * 100).toFixed(0)}%
${varietyFactors.focusPlayer ? `- Focus Player: ${varietyFactors.focusPlayer.fullName} (${varietyFactors.focusPlayer.position.abbreviation})` : ''}

${game.homeTeam.displayName.toUpperCase()} ROSTER:
${formatRoster(rosters.homeRoster, game.homeTeam.displayName)}

${game.awayTeam.displayName.toUpperCase()} ROSTER:
${formatRoster(rosters.awayRoster, game.awayTeam.displayName)}

Generate a strategic 3-leg parlay using the ${varietyFactors.strategy} approach with ${varietyFactors.gameScript} game script in mind.`
  }

  private parseAIResponse(
    response: string,
    game: NFLGame,
    varietyFactors: VarietyFactors,
    strategy: StrategyConfig
  ): GeneratedParlay {
    try {
      const parsed = JSON.parse(response)

      // Validate structure
      if (
        !parsed.legs ||
        !Array.isArray(parsed.legs) ||
        parsed.legs.length !== 3
      ) {
        throw new CloudFunctionError(
          'INVALID_STRUCTURE',
          'AI response must contain exactly 3 legs'
        )
      }

      // Process legs
      const validatedLegs = this.processLegData(parsed.legs)

      // Calculate parlay odds
      const individualOdds = validatedLegs.map(leg => leg.odds)
      const calculatedOdds = this.calculateParlayOdds(individualOdds)

      // Process game summary
      const gameSummary = this.processGameSummary(parsed.gameSummary, game)

      const parlay: GeneratedParlay = {
        id: `parlay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        legs: validatedLegs as [ParlayLeg, ParlayLeg, ParlayLeg],
        gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - Week ${game.week}`,
        aiReasoning:
          parsed.aiReasoning || `Generated using ${strategy.name} approach`,
        overallConfidence: Math.min(
          Math.max(parsed.overallConfidence || 6, 1),
          10
        ),
        estimatedOdds: parsed.estimatedOdds || calculatedOdds,
        createdAt: new Date().toISOString(),
        gameSummary,
      }

      return parlay
    } catch (error) {
      console.error('Error parsing AI response:', error)
      throw new CloudFunctionError(
        'PARSE_ERROR',
        'Failed to parse AI response',
        error
      )
    }
  }

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
        selection: leg.selection || 'Unknown selection',
        target: leg.target || 'Unknown target',
        reasoning: leg.reasoning || 'Strategic selection based on analysis',
        confidence: Math.min(Math.max(leg.confidence || 5, 1), 10),
        odds: this.validateOdds(leg.odds) || '-110',
      }
    })
  }

  private processGameSummary(rawSummary: any, game: NFLGame): GameSummary {
    const validGameFlows: GameSummary['gameFlow'][] = [
      'high_scoring_shootout',
      'defensive_grind',
      'balanced_tempo',
      'potential_blowout',
    ]

    const gameFlow = validGameFlows.includes(rawSummary?.gameFlow)
      ? rawSummary.gameFlow
      : 'balanced_tempo'

    return {
      matchupAnalysis:
        rawSummary?.matchupAnalysis ||
        `${game.awayTeam.displayName} vs ${game.homeTeam.displayName} matchup analysis pending.`,
      gameFlow,
      keyFactors: Array.isArray(rawSummary?.keyFactors)
        ? rawSummary.keyFactors.slice(0, 5)
        : ['Home field advantage', 'Weather conditions', 'Team motivation'],
      prediction:
        rawSummary?.prediction ||
        `Competitive matchup expected between ${game.awayTeam.displayName} and ${game.homeTeam.displayName}.`,
      confidence: Math.min(Math.max(rawSummary?.confidence || 6, 1), 10),
    }
  }

  private validateOdds(odds: any): string | null {
    if (typeof odds === 'string' && /^[+-]\d+$/.test(odds)) {
      return odds
    }
    if (typeof odds === 'number') {
      return odds > 0 ? `+${odds}` : `${odds}`
    }
    return null
  }

  private calculateParlayOdds(individualOdds: string[]): string {
    let combinedDecimal = 1

    individualOdds.forEach(odds => {
      const num = parseInt(odds.replace('+', ''))
      const decimal = num > 0 ? num / 100 + 1 : 100 / Math.abs(num) + 1
      combinedDecimal *= decimal
    })

    const americanOdds =
      combinedDecimal >= 2
        ? Math.round((combinedDecimal - 1) * 100)
        : Math.round(-100 / (combinedDecimal - 1))

    return americanOdds > 0 ? `+${americanOdds}` : `${americanOdds}`
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
