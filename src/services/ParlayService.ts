import { INFLClient, IOpenAIClient } from '../api'
import { API_CONFIG } from '../config/api'
import { GameRosters, GeneratedParlay, NFLGame, NFLPlayer } from '../types'
import { generateVarietyFactors, PARLAY_STRATEGIES } from './parlayStrategies'
import { createFallbackParlay, parseAIResponse } from './parlayUtils'
import { createParlayPrompt, createSystemPrompt } from './promptGenerators'

/**
 * Parlay Service
 * Handles business logic for parlay generation
 * Coordinates between NFL data and OpenAI clients
 */
export class ParlayService {
  constructor(
    private nflClient: INFLClient,
    private openaiClient: IOpenAIClient
  ) {}

  /**
   * Generate a parlay for a specific game
   * Main business logic method that coordinates all steps
   */
  async generateParlay(game: NFLGame): Promise<GeneratedParlay> {
    try {
      // Step 1: Get team rosters for accurate player props
      const rosters = await this.getGameRosters(game)

      // Step 2: Validate rosters - fallback if insufficient data
      if (rosters.homeRoster.length === 0 || rosters.awayRoster.length === 0) {
        return createFallbackParlay(game)
      }

      // Step 3: Generate variety factors for this parlay
      const varietyFactors = generateVarietyFactors()
      const strategy = PARLAY_STRATEGIES[varietyFactors.strategy]

      // Step 4: Create AI prompts using current rosters
      const systemPrompt = createSystemPrompt(strategy, varietyFactors)
      const userPrompt = createParlayPrompt(
        game,
        rosters.homeRoster,
        rosters.awayRoster,
        varietyFactors
      )

      // Step 5: Generate parlay using OpenAI
      const aiResponse = await this.callOpenAI(
        systemPrompt,
        userPrompt,
        strategy
      )

      // Step 6: Parse and validate AI response
      const parlay = parseAIResponse(
        aiResponse,
        game,
        rosters.homeRoster,
        rosters.awayRoster,
        varietyFactors
      )

      return parlay
    } catch (error) {
      console.error('Error generating parlay:', error)
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
   * Useful for giving users options
   */
  async generateMultipleParlays(
    game: NFLGame,
    count: number = 3
  ): Promise<GeneratedParlay[]> {
    const parlays: GeneratedParlay[] = []

    for (let i = 0; i < count; i++) {
      try {
        const parlay = await this.generateParlay(game)
        parlays.push(parlay)

        // Small delay to ensure variety in random factors
        await this.delay(100)
      } catch (error) {
        console.error(`Error generating parlay ${i + 1}:`, error)
        parlays.push(createFallbackParlay(game))
      }
    }

    return parlays
  }

  /**
   * Validate a generated parlay
   * Business logic for checking parlay validity
   */
  validateParlay(parlay: GeneratedParlay): boolean {
    // Check basic structure
    if (!parlay.legs || parlay.legs.length !== 3) {
      return false
    }

    // Check each leg has required fields
    for (const leg of parlay.legs) {
      if (!leg.id || !leg.betType || !leg.selection || !leg.target) {
        return false
      }

      // Check confidence is within valid range
      if (leg.confidence < 1 || leg.confidence > 10) {
        return false
      }
    }

    return true
  }

  /**
   * Get parlay statistics for analytics
   */
  getParlayStats(parlay: GeneratedParlay): {
    averageConfidence: number
    betTypeDistribution: Record<string, number>
    estimatedPayout: string
  } {
    const averageConfidence =
      parlay.legs.reduce((sum, leg) => sum + leg.confidence, 0) /
      parlay.legs.length

    const betTypeDistribution: Record<string, number> = {}
    parlay.legs.forEach(leg => {
      betTypeDistribution[leg.betType] =
        (betTypeDistribution[leg.betType] || 0) + 1
    })

    return {
      averageConfidence: Math.round(averageConfidence * 10) / 10,
      betTypeDistribution,
      estimatedPayout: parlay.estimatedOdds,
    }
  }

  // Private helper methods

  private async callOpenAI(
    systemPrompt: string,
    userPrompt: string,
    strategy: any
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
      temperature: strategy.temperature,
      max_tokens: 1500,
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

  private transformRosterResponse(data: any): NFLPlayer[] {
    if (!data.athletes || data.athletes.length === 0) {
      return []
    }

    // ESPN groups athletes by position, we need to flatten them
    const allAthletes = data.athletes.flatMap((group: any) => group.items || [])

    return allAthletes.map((athlete: any) => ({
      id: athlete.id,
      name: athlete.displayName,
      displayName: athlete.displayName,
      position:
        athlete.position?.abbreviation || athlete.position?.name || 'N/A',
      jerseyNumber: athlete.jersey || '0',
      experience: athlete.experience?.years || 0,
      college: athlete.college?.name,
    }))
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
