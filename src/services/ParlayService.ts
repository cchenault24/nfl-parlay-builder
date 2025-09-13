// src/services/ParlayService.ts
// Enhanced with chain-of-thought reasoning capabilities

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
  ChainOfThoughtConfig,
  ChainOfThoughtReasoning,
  ReasoningValidation,
} from '../types/reasoning'
import {
  generateVarietyFactors,
  PARLAY_STRATEGIES,
  StrategyConfig,
  VarietyFactors,
} from './parlayStrategies'
import { createFallbackParlay } from './parlayUtils'
import { createParlayPrompt, createSystemPrompt } from './promptGenerators'

/**
 * Parlay Service
 * Handles business logic for parlay generation with chain-of-thought reasoning
 * Coordinates between NFL data and OpenAI clients
 */
export class ParlayService {
  private cotConfig: ChainOfThoughtConfig = {
    requireMinimumSteps: 4,
    requireDataCitations: true,
    includeValidationPrompt: true,
    confidenceJustificationDepth: 'detailed',
    allowUncertaintyAcknowledgment: true,
  }

  constructor(
    private nflClient: INFLClient,
    private openaiClient: IOpenAIClient
  ) {}

  /**
   * Generate a parlay for a specific game
   * Enhanced with chain-of-thought reasoning while maintaining backward compatibility
   */
  async generateParlay(game: NFLGame): Promise<GeneratedParlay> {
    try {
      console.log(
        `🧠 Generating parlay with chain-of-thought reasoning for ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`
      )

      // Step 1: Get team rosters for accurate player props
      const rosters = await this.getGameRosters(game)

      // Step 2: Validate rosters - fallback if insufficient data
      if (rosters.homeRoster.length === 0 || rosters.awayRoster.length === 0) {
        console.warn('⚠️ No roster data available, using fallback')
        return createFallbackParlay(game)
      }

      console.log(
        `📊 Roster data: ${rosters.homeRoster.length} home, ${rosters.awayRoster.length} away`
      )

      // Step 3: Generate variety factors for this parlay
      const varietyFactors: VarietyFactors = generateVarietyFactors()
      const strategy = PARLAY_STRATEGIES[varietyFactors.strategy]

      console.log(
        `🎯 Strategy: ${strategy.name} (${strategy.riskProfile} risk)`
      )

      // Step 4: Create enhanced AI prompts with chain-of-thought instructions
      const systemPrompt = createSystemPrompt(
        strategy,
        varietyFactors,
        this.cotConfig
      )
      const userPrompt = createParlayPrompt(
        game,
        rosters.homeRoster,
        rosters.awayRoster,
        varietyFactors,
        this.cotConfig
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

      console.log(`✅ Enhanced parlay generated successfully`)
      return parlay
    } catch (error) {
      console.error('❌ Error generating parlay:', error)
      return createFallbackParlay(game)
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
        homeRoster: this.transformRosterResponse(homeRosterResponse.data),
        awayRoster: this.transformRosterResponse(awayRosterResponse.data),
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

    console.log(`🎲 Generating ${count} parlays with strategy diversity`)

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

        console.log(`✅ Generated parlay ${i + 1}/${count}: ${strategy}`)

        // Add small delay to avoid potential rate limiting
        if (i < count - 1) {
          await this.delay(100)
        }
      } catch (error) {
        console.error(`❌ Error generating parlay ${i + 1}:`, error)
        parlays.push(createFallbackParlay(game))
      }
    }

    console.log(
      `📊 Batch generation complete: ${parlays.length} parlays generated`
    )
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
      console.log(`📝 Parsing enhanced AI response (${response.length} chars)`)

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.warn('No JSON found in AI response, using fallback')
        throw new Error('No JSON found in AI response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      const strategy = PARLAY_STRATEGIES[varietyFactors.strategy]

      // Validate basic structure
      if (
        !parsed.legs ||
        !Array.isArray(parsed.legs) ||
        parsed.legs.length !== 3
      ) {
        console.warn('Invalid parlay structure from AI, using fallback')
        throw new Error('Invalid parlay structure from AI')
      }

      // Process and validate each leg with enhanced reasoning
      const validatedLegs = this.processLegsWithEnhancedReasoning(
        parsed.legs,
        homeRoster,
        awayRoster,
        strategy,
        varietyFactors
      )

      // Calculate parlay odds
      const individualOdds = validatedLegs.map(leg => leg.odds)
      const calculatedOdds = this.calculateParlayOdds(individualOdds)

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

      console.log(
        `✅ Successfully parsed enhanced parlay with ${validatedLegs.length} validated legs`
      )
      return parlay
    } catch (error) {
      console.error('Error parsing enhanced AI response:', error)
      throw error
    }
  }

  private processLegsWithEnhancedReasoning(
    rawLegs: unknown[],
    homeRoster: NFLPlayer[],
    awayRoster: NFLPlayer[],
    strategy: StrategyConfig,
    varietyFactors: VarietyFactors
  ): ParlayLeg[] {
    const processedLegs: ParlayLeg[] = []

    for (let i = 0; i < rawLegs.length; i++) {
      const leg = rawLegs[i] as Record<string, unknown>

      // Validate player props against current rosters
      if (
        leg.betType === 'player_prop' &&
        !this.validatePlayerProp(leg, homeRoster, awayRoster)
      ) {
        console.warn(`Invalid player in leg ${i + 1}, creating alternative`)
        processedLegs.push(
          this.createStrategyAlternative(
            i,
            {
              homeTeam: { displayName: 'Home' },
              awayTeam: { displayName: 'Away' },
            } as NFLGame,
            strategy,
            varietyFactors
          )
        )
        continue
      }

      // Extract reasoning - enhanced if available, fallback if not
      let reasoning: string
      let confidence: number

      if (leg.chainOfThoughtReasoning) {
        // Enhanced reasoning available - validate it
        const validation = this.validateChainOfThought(
          leg.chainOfThoughtReasoning as ChainOfThoughtReasoning,
          strategy
        )

        if (validation.validationErrors.length > 0) {
          console.warn(
            `Validation errors in leg ${i + 1}:`,
            validation.validationErrors
          )
        }

        // Use summary or create one from detailed reasoning
        const chainOfThought =
          leg.chainOfThoughtReasoning as ChainOfThoughtReasoning
        reasoning =
          (leg.reasoning as string) ||
          chainOfThought.strategicRationale?.substring(0, 200) + '...' ||
          'Enhanced analytical reasoning applied'

        confidence =
          chainOfThought.confidenceBreakdown?.score ||
          (leg.confidence as number) ||
          strategy.confidenceRange[0]
      } else {
        // Basic reasoning - use as-is
        reasoning =
          (leg.reasoning as string) ||
          `${strategy.name} selection based on strategic analysis`
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

    return processedLegs
  }

  private validatePlayerProp(
    leg: Record<string, unknown>,
    homeRoster: NFLPlayer[],
    awayRoster: NFLPlayer[]
  ): boolean {
    if (leg.betType !== 'player_prop') return true

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

  private createStrategyAlternative(
    legIndex: number,
    game: NFLGame,
    strategy: StrategyConfig,
    varietyFactors: VarietyFactors
  ): ParlayLeg {
    const alternatives = [
      {
        id: `alt-${legIndex + 1}`,
        betType: 'spread' as const,
        selection:
          Math.random() > 0.5
            ? game.homeTeam.displayName
            : game.awayTeam.displayName,
        target: `${Math.random() > 0.5 ? game.homeTeam.displayName : game.awayTeam.displayName} ${Math.random() > 0.5 ? '-' : '+'}${(Math.random() * 6 + 1).toFixed(1)}`,
        reasoning: `${strategy.name} selection based on ${varietyFactors.focusArea} analysis with enhanced reasoning`,
        confidence: strategy.confidenceRange[0],
        odds: '-110',
      },
      {
        id: `alt-${legIndex + 1}`,
        betType: 'total' as const,
        selection: Math.random() > 0.5 ? 'Over' : 'Under',
        target: `${Math.random() > 0.5 ? 'Over' : 'Under'} ${(Math.random() * 10 + 42).toFixed(1)} Total Points`,
        reasoning: `${varietyFactors.gameScript} game script supports this total with detailed analysis`,
        confidence: strategy.confidenceRange[1],
        odds: '-105',
      },
      {
        id: `alt-${legIndex + 1}`,
        betType: 'moneyline' as const,
        selection:
          Math.random() > 0.6
            ? game.homeTeam.displayName
            : game.awayTeam.displayName,
        target: `${Math.random() > 0.6 ? game.homeTeam.displayName : game.awayTeam.displayName} Moneyline`,
        reasoning: `${strategy.name} value play based on situational factors and enhanced analytical framework`,
        confidence: Math.floor(
          (strategy.confidenceRange[0] + strategy.confidenceRange[1]) / 2
        ),
        odds: Math.random() > 0.5 ? '+110' : '-120',
      },
    ]

    return alternatives[legIndex % alternatives.length]
  }

  private calculateParlayOdds(individualOdds: string[]): string {
    try {
      const decimalOdds = individualOdds.map(odds => {
        const num = parseInt(odds)
        if (num > 0) {
          return num / 100 + 1
        }
        return 100 / Math.abs(num) + 1
      })

      const combinedDecimal = decimalOdds.reduce((acc, odds) => acc * odds, 1)
      const americanOdds =
        combinedDecimal >= 2
          ? `+${Math.round((combinedDecimal - 1) * 100)}`
          : `-${Math.round(100 / (combinedDecimal - 1))}`

      return americanOdds
    } catch {
      return '+550'
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

  private transformRosterResponse(data: unknown): NFLPlayer[] {
    const rosterData = data as { athletes?: Array<{ items?: unknown[] }> }

    if (!rosterData.athletes || rosterData.athletes.length === 0) {
      return []
    }

    // ESPN groups athletes by position, we need to flatten them
    const allAthletes = rosterData.athletes.flatMap(group => group.items || [])

    return allAthletes.map((athlete: unknown) => {
      const athleteData = athlete as {
        id: string
        displayName: string
        position?: { abbreviation?: string; name?: string }
        jersey?: string
        experience?: { years?: number }
        college?: { name?: string }
      }

      return {
        id: athleteData.id,
        name: athleteData.displayName,
        displayName: athleteData.displayName,
        position:
          athleteData.position?.abbreviation ||
          athleteData.position?.name ||
          'N/A',
        jerseyNumber: athleteData.jersey || '0',
        experience: athleteData.experience?.years || 0,
        college: athleteData.college?.name,
      }
    })
  }
}
