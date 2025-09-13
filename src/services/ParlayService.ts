import { INFLClient, IOpenAIClient } from '../api'
import { API_CONFIG } from '../config/api'
import {
  GameRosters,
  GameSummary,
  GeneratedParlay,
  NFLGame,
  ParlayLeg,
} from '../types'
import { NFLDataService } from './NFLDataService'
import {
  generateVarietyFactors,
  PARLAY_STRATEGIES,
  StrategyConfig,
  VarietyFactors,
} from './parlayStrategies'
import { calculateParlayOdds } from './parlayUtils'
import { createParlayPrompt, createSystemPrompt } from './promptGenerators'

/**
 * Parlay Service
 * Handles business logic for parlay generation with chain-of-thought reasoning
 * Coordinates between NFL data and OpenAI clients
 */
export class ParlayService {
  constructor(
    private nflClient: INFLClient,
    private openaiClient: IOpenAIClient,
    private nflDataService: NFLDataService
  ) {}

  /**
   * Generate a parlay for a specific game
   * Enhanced with chain-of-thought reasoning and AI game summary
   */
  async generateParlay(game: NFLGame): Promise<GeneratedParlay> {
    try {
      // Step 1: Get team rosters for accurate player props
      const rosters = await this.getGameRosters(game)

      // Step 2: Validate rosters - throw error if insufficient data
      if (rosters.homeRoster.length === 0 || rosters.awayRoster.length === 0) {
        console.warn('⚠️ No roster data available')
        throw new Error('Insufficient roster data to generate parlay')
      }

      // Step 3: Generate variety factors for this parlay
      const varietyFactors: VarietyFactors = generateVarietyFactors()
      const strategy = PARLAY_STRATEGIES[varietyFactors.strategy]

      // Step 4: Create enhanced AI prompts with chain-of-thought instructions and game summary
      const systemPrompt = createSystemPrompt(strategy)
      const userPrompt = createParlayPrompt(
        game,
        rosters.homeRoster,
        rosters.awayRoster,
        varietyFactors
      )

      // Step 5: Generate parlay using OpenAI with enhanced parameters
      const aiResponse = await this.callOpenAI(
        systemPrompt,
        userPrompt,
        strategy
      )

      // Step 6: Parse and validate enhanced AI response (now includes game summary)
      const parlay = this.parseAIResponse(aiResponse, game, varietyFactors)

      return parlay
    } catch (error) {
      console.error('❌ Error generating parlay:', error)
      throw error // Re-throw the error instead of creating fallback
    }
  }

  /**
   * Get rosters for both teams in a game
   * Business logic method that combines multiple NFL API calls
   */
  async getGameRosters(game: NFLGame): Promise<GameRosters> {
    try {
      const [homeRosterResponse, awayRosterResponse] = await Promise.all([
        this.nflClient.getTeamRoster(game.homeTeam.id),
        this.nflClient.getTeamRoster(game.awayTeam.id),
      ])

      return {
        homeRoster: this.nflDataService.transformRosterResponse(
          homeRosterResponse.data
        ),
        awayRoster: this.nflDataService.transformRosterResponse(
          awayRosterResponse.data
        ),
      }
    } catch (error) {
      console.error('Error fetching game rosters:', error)
      return { homeRoster: [], awayRoster: [] }
    }
  }

  /**
   * Generate multiple parlays for variety
   * Enhanced with better strategy diversity
   */
  async generateMultipleParlays(
    game: NFLGame,
    count: number = 3
  ): Promise<GeneratedParlay[]> {
    const parlays: GeneratedParlay[] = []
    const usedStrategies = new Set<string>()

    for (let i = 0; i < count; i++) {
      try {
        let attempts = 0
        let parlay: GeneratedParlay

        // Try to get different strategies for variety
        do {
          parlay = await this.generateParlay(game)
          attempts++
        } while (
          usedStrategies.has(this.getStrategyFromParlay(parlay)) &&
          attempts < 5
        )

        const strategy = this.getStrategyFromParlay(parlay)
        usedStrategies.add(strategy)
        parlays.push(parlay)

        // Add small delay to avoid potential rate limiting
        if (i < count - 1) {
          await this.delay(100)
        }
      } catch (error) {
        console.error(`❌ Error generating parlay ${i + 1}:`, error)
        // Skip this parlay instead of using fallback
        continue
      }
    }

    return parlays
  }

  // Private helper methods

  private async callOpenAI(
    systemPrompt: string,
    userPrompt: string,
    strategy: StrategyConfig
  ): Promise<string> {
    const response = await this.openaiClient.createChatCompletion({
      model: API_CONFIG.OPENAI.models.default,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: strategy.temperature * 0.8, // Slightly lower for better consistency
      max_tokens: 4000, // 🆕 INCREASED for game summary content
      top_p: 0.9,
      frequency_penalty: 0.3,
      presence_penalty: 0.4,
      seed: Math.floor(Math.random() * 1000000),
    })

    const content = response.data.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    return content
  }

  private parseAIResponse(
    response: string,
    game: NFLGame,
    varietyFactors: VarietyFactors
  ): GeneratedParlay {
    try {
      const parsed = JSON.parse(response)
      const strategy = PARLAY_STRATEGIES[varietyFactors.strategy]

      // Validate basic structure
      if (
        !parsed.legs ||
        !Array.isArray(parsed.legs) ||
        parsed.legs.length !== 3
      ) {
        console.error('Invalid parlay structure:', parsed)
        throw new Error('Invalid parlay structure from AI')
      }

      // Process and validate each leg with enhanced reasoning
      const validatedLegs = this.processLegsWithEnhancedReasoning(parsed.legs)

      // Calculate parlay odds
      const individualOdds = validatedLegs.map(leg => leg.odds)
      const calculatedOdds = calculateParlayOdds(individualOdds)

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
      console.error('❌ Error parsing AI response:', error)
      throw new Error('Failed to parse AI response for parlay generation')
    }
  }

  private processGameSummary(rawSummary: any, game: NFLGame): GameSummary {
    // Validate game flow enum
    const validGameFlows: GameSummary['gameFlow'][] = [
      'high_scoring_shootout',
      'defensive_grind',
      'balanced_tempo',
      'potential_blowout',
    ]

    const gameFlow = validGameFlows.includes(rawSummary.gameFlow)
      ? rawSummary.gameFlow
      : 'balanced_tempo'

    return {
      matchupAnalysis:
        rawSummary.matchupAnalysis ||
        `${game.awayTeam.displayName} vs ${game.homeTeam.displayName} matchup analysis pending.`,
      gameFlow,
      keyFactors: Array.isArray(rawSummary.keyFactors)
        ? rawSummary.keyFactors.slice(0, 5) // Limit to 5 factors
        : ['Home field advantage', 'Weather conditions', 'Team motivation'],
      prediction:
        rawSummary.prediction ||
        `Competitive matchup expected between ${game.awayTeam.displayName} and ${game.homeTeam.displayName}.`,
      confidence: Math.min(Math.max(rawSummary.confidence || 6, 1), 10),
    }
  }

  private processLegsWithEnhancedReasoning(legs: any[]): ParlayLeg[] {
    // Implementation from existing code
    // This method should remain the same as your current implementation
    return legs.map((leg: any, index: number) => ({
      id: leg.id || `leg-${index + 1}`,
      betType: leg.betType || 'spread',
      selection: leg.selection || '',
      target: leg.target || '',
      reasoning: leg.reasoning || 'Strategic selection based on analysis',
      confidence: Math.min(Math.max(leg.confidence || 5, 1), 10),
      odds: leg.odds || '-110',
    }))
  }

  private getStrategyFromParlay(parlay: GeneratedParlay): string {
    const contextMatch = parlay.gameContext.match(/ - (.+)$/)
    if (contextMatch) {
      return contextMatch[1]
    }

    const strategies = Object.values(PARLAY_STRATEGIES).map(s => s.name)
    const foundStrategy = strategies.find(name =>
      parlay.aiReasoning.toLowerCase().includes(name.toLowerCase())
    )

    return foundStrategy || 'Unknown Strategy'
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
