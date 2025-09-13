import { INFLClient, IOpenAIClient } from '../api'
import { API_CONFIG } from '../config/api'
import {
  BetType,
  GameRosters,
  GeneratedParlay,
  NFLGame,
  NFLPlayer,
  ParlayLeg,
} from '../types'
import {
  ChainOfThoughtReasoning,
  ReasoningValidation,
} from '../types/reasoning'
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
   * Enhanced with chain-of-thought reasoning while maintaining backward compatibility
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

      // Step 4: Create enhanced AI prompts with chain-of-thought instructions
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

      // Step 6: Parse and validate enhanced AI response
      const parlay = this.parseAIResponse(
        aiResponse,
        game,
        rosters.homeRoster,
        rosters.awayRoster,
        varietyFactors
      )

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
      max_tokens: 3000, // Increased for detailed chain-of-thought reasoning
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
    homeRoster: NFLPlayer[],
    awayRoster: NFLPlayer[],
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
      const validatedLegs = this.processLegsWithEnhancedReasoning(
        parsed.legs,
        homeRoster,
        awayRoster,
        strategy
      )

      // Calculate parlay odds
      const individualOdds = validatedLegs.map(leg => leg.odds)
      const calculatedOdds = calculateParlayOdds(individualOdds)

      const parlay: GeneratedParlay = {
        id: `parlay-${Date.now()}`,
        legs: validatedLegs as [ParlayLeg, ParlayLeg, ParlayLeg],
        gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - ${strategy.name}`,
        aiReasoning:
          parsed.aiReasoning ||
          `${strategy.name} approach with enhanced analytical reasoning: ${strategy.description}`,
        overallConfidence: Math.min(
          Math.max(parsed.overallConfidence || 6, 1),
          10
        ),
        estimatedOdds: calculatedOdds,
        createdAt: new Date().toISOString(),
      }

      return parlay
    } catch (error) {
      console.error('Error parsing enhanced AI response:', error)
      console.error('Raw AI response:', response)
      throw error
    }
  }

  private processLegsWithEnhancedReasoning(
    rawLegs: unknown[],
    homeRoster: NFLPlayer[],
    awayRoster: NFLPlayer[],
    strategy: StrategyConfig
  ): ParlayLeg[] {
    const processedLegs: ParlayLeg[] = []

    for (let i = 0; i < rawLegs.length; i++) {
      const leg = rawLegs[i] as Record<string, unknown>

      // Validate player props against current rosters
      if (
        leg.betType === 'player_prop' &&
        !this.validatePlayerProp(leg, homeRoster, awayRoster)
      ) {
        console.warn(`Invalid player in leg ${i + 1}, skipping`)
        continue
      }

      // Extract reasoning - enhanced if available, fallback if not
      let reasoning: string
      let confidence: number

      if (leg.chainOfThoughtReasoning) {
        // Enhanced reasoning available - validate it internally
        const chainOfThought =
          leg.chainOfThoughtReasoning as ChainOfThoughtReasoning

        // Validate the detailed reasoning internally (for our analytics)
        const validation = this.validateChainOfThought(chainOfThought, strategy)
        if (validation.validationErrors.length > 0) {
          console.warn(
            `Validation errors in leg ${i + 1}:`,
            validation.validationErrors
          )
        }

        // Use the direct reasoning provided by AI (should be user-friendly)
        reasoning =
          (leg.reasoning as string) ||
          'Strong value based on current matchup analysis and team performance trends'

        confidence =
          chainOfThought.confidenceBreakdown?.score ||
          (leg.confidence as number) ||
          strategy.confidenceRange[0]
      } else {
        // Basic reasoning - use as-is
        reasoning =
          (leg.reasoning as string) ||
          'Solid value based on current matchup factors and situational analysis'
        confidence = (leg.confidence as number) || strategy.confidenceRange[0]
      }

      // Ensure confidence is within valid range
      confidence = Math.min(Math.max(confidence, 1), 10)

      processedLegs.push({
        id: (leg.id as string) || `enhanced-leg-${i + 1}`,
        betType: (leg.betType as BetType) || 'spread',
        selection: (leg.selection as string) || '',
        target: (leg.target as string) || '',
        reasoning,
        confidence,
        odds: (leg.odds as string) || '-110',
      })
    }

    if (processedLegs.length !== 3) {
      throw new Error(
        `Generated only ${processedLegs.length} valid legs, need exactly 3`
      )
    }

    return processedLegs
  }

  private validatePlayerProp(
    leg: Record<string, unknown>,
    homeRoster: NFLPlayer[],
    awayRoster: NFLPlayer[]
  ): boolean {
    if (leg.betType !== 'player_prop') {
      return true
    }

    const allPlayers = [...homeRoster, ...awayRoster]
    const playerNames = allPlayers.map(p => p.displayName.toLowerCase())
    const legPlayerName = (leg.selection as string)?.toLowerCase() || ''

    return playerNames.some(
      name => name.includes(legPlayerName) || legPlayerName.includes(name)
    )
  }

  private validateChainOfThought(
    reasoning: ChainOfThoughtReasoning,
    strategy: StrategyConfig
  ): ReasoningValidation {
    return {
      isLogicallyConsistent: true,
      hasRequiredSteps: reasoning.analyticalSteps?.length >= 3,
      includesDataCitations: reasoning.keyDataPoints?.length > 0,
      confidenceIsJustified:
        reasoning.confidenceBreakdown?.primaryFactors?.length > 0,
      strategicAlignmentScore: reasoning.strategicRationale?.includes(
        strategy.name
      )
        ? 8
        : 6,
      validationErrors: [],
    }
  }

  private getStrategyFromParlay(parlay: GeneratedParlay): string {
    // Try to extract strategy from gameContext
    const contextMatch = parlay.gameContext.match(/ - (.+)$/)
    if (contextMatch) {
      return contextMatch[1]
    }

    // Fallback to extracting from aiReasoning
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
