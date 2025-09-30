// functions/src/service/ai/providers/MockProvider.ts
import {
  GameRosters,
  GameSummary,
  GeneratedParlay,
  NFLGame,
  ParlayLeg,
  StrategyConfig,
} from '../../../types'
import {
  AIProviderResponse,
  BaseParlayProvider,
  ParlayGenerationContext,
} from '../BaseParlayProvider'

/**
 * Mock provider configuration options
 */
export interface MockConfig {
  enableErrorSimulation?: boolean
  errorRate?: number
  minDelayMs?: number
  maxDelayMs?: number
  defaultConfidence?: number
  debugMode?: boolean
}

/**
 * Mock parlay template for generating realistic test data
 */
interface MockParlayTemplate {
  legs: Array<{
    betType: string
    selection: string
    target: string
    reasoning: string
    confidence: number
    odds: string
  }>
  aiReasoning: string
  overallConfidence: number
  estimatedOdds: string
  gameSummary: {
    matchupAnalysis: string
    gameFlow:
      | 'high_scoring_shootout'
      | 'defensive_grind'
      | 'balanced_tempo'
      | 'potential_blowout'
    keyFactors: string[]
    prediction: string
    confidence: number
  }
}

/**
 * Mock provider implementation for parlay generation
 * Provides realistic development/testing data without API costs
 */
export class MockProvider extends BaseParlayProvider {
  private config: Required<MockConfig>

  constructor(config: MockConfig = {}) {
    super('mock', 0, 50) // No retries needed, very fast responses

    this.config = {
      enableErrorSimulation: config.enableErrorSimulation ?? true,
      errorRate: config.errorRate ?? 0.05, // 5% error rate
      minDelayMs: config.minDelayMs ?? 500,
      maxDelayMs: config.maxDelayMs ?? 1500,
      defaultConfidence: config.defaultConfidence ?? 6,
      debugMode: config.debugMode ?? false,
    }

    if (this.config.debugMode) {
      console.log('🎭 MockProvider initialized with config:', this.config)
    }
  }

  /**
   * Generate a mock parlay
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
      // Simulate API delay
      const delay =
        Math.random() * (this.config.maxDelayMs - this.config.minDelayMs) +
        this.config.minDelayMs
      await new Promise(resolve => setTimeout(resolve, delay))

      // Simulate API errors for testing
      if (
        this.config.enableErrorSimulation &&
        Math.random() < this.config.errorRate
      ) {
        throw new Error(
          '🎭 MOCK API ERROR: Simulated failure for testing error handling'
        )
      }

      // Generate strategy-aware parlay
      const template = this.selectTemplateByStrategy(context.strategy)
      const parlay = this.generateFromTemplate(template, game, context)
      const latency = Date.now() - startTime

      if (this.config.debugMode) {
        console.log(
          `🎭 Generated mock parlay for ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`
        )
      }

      return {
        parlay,
        metadata: {
          provider: this.providerName,
          model: 'mock-gpt-4o-mini',
          tokens: Math.floor(Math.random() * 1000) + 500, // Simulate token usage
          latency,
          confidence: parlay.overallConfidence,
        },
      }
    } catch (error) {
      if (this.config.debugMode) {
        console.error('🎭 Mock provider error:', error)
      }
      throw error
    }
  }

  /**
   * Validate mock connection (always returns true)
   */
  async validateConnection(): Promise<boolean> {
    return true
  }

  /**
   * Get mock provider information
   */
  getModelInfo(): {
    name: string
    version: string
    capabilities: string[]
  } {
    return {
      name: 'Mock OpenAI',
      version: 'mock-gpt-4o-mini',
      capabilities: [
        'mock_chat_completion',
        'mock_json_mode',
        'error_simulation',
        'strategy_awareness',
        'fast_response',
      ],
    }
  }

  /**
   * Update mock configuration
   */
  updateConfig(newConfig: Partial<MockConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Select appropriate template based on strategy
   */
  private selectTemplateByStrategy(
    strategy: StrategyConfig
  ): MockParlayTemplate {
    const templates = this.getTemplatesByStrategy(strategy)
    return templates[Math.floor(Math.random() * templates.length)]
  }

  /**
   * Get templates organized by strategy type
   */
  private getTemplatesByStrategy(
    strategy: StrategyConfig
  ): MockParlayTemplate[] {
    if (
      strategy.riskLevel === 'aggressive' ||
      strategy.name.toLowerCase().includes('aggressive')
    ) {
      return this.getAggressiveTemplates()
    }

    if (
      strategy.name.toLowerCase().includes('player') ||
      strategy.name.toLowerCase().includes('prop')
    ) {
      return this.getPlayerFocusedTemplates()
    }

    if (
      strategy.riskLevel === 'conservative' ||
      strategy.name.toLowerCase().includes('conservative')
    ) {
      return this.getConservativeTemplates()
    }

    return this.getBalancedTemplates()
  }

  /**
   * Generate parlay from template
   */
  private generateFromTemplate(
    template: MockParlayTemplate,
    game: NFLGame,
    context: ParlayGenerationContext
  ): GeneratedParlay {
    const legs: ParlayLeg[] = template.legs.map((leg, index) => ({
      id: `mock-leg-${index + 1}`,
      betType: leg.betType as any,
      selection: this.personalizeSelection(leg.selection, game),
      target: leg.target,
      reasoning: leg.reasoning,
      confidence: Math.min(
        Math.max(leg.confidence + this.getVarianceAdjustment(), 1),
        10
      ),
      odds: leg.odds,
    }))

    const gameSummary: GameSummary = {
      matchupAnalysis: this.personalizeAnalysis(
        template.gameSummary.matchupAnalysis,
        game
      ),
      gameFlow: template.gameSummary.gameFlow,
      keyFactors: template.gameSummary.keyFactors,
      prediction: this.personalizePrediction(
        template.gameSummary.prediction,
        game
      ),
      confidence: template.gameSummary.confidence,
    }

    return {
      id: `mock-parlay-${Date.now()}`,
      legs,
      aiReasoning: template.aiReasoning,
      overallConfidence: template.overallConfidence,
      estimatedOdds: template.estimatedOdds,
      gameSummary,
      createdAt: new Date().toISOString(),
      gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - Week ${game.week}`,
    }
  }

  /**
   * Personalize selection text with actual team names
   */
  private personalizeSelection(selection: string, game: NFLGame): string {
    return selection
      .replace(/\{awayTeam\}/g, game.awayTeam.displayName)
      .replace(/\{homeTeam\}/g, game.homeTeam.displayName)
      .replace(
        /\{awayAbbrev\}/g,
        game.awayTeam.abbreviation ||
          game.awayTeam.displayName.slice(0, 3).toUpperCase()
      )
      .replace(
        /\{homeAbbrev\}/g,
        game.homeTeam.abbreviation ||
          game.homeTeam.displayName.slice(0, 3).toUpperCase()
      )
  }

  /**
   * Personalize analysis text with actual team names
   */
  private personalizeAnalysis(analysis: string, game: NFLGame): string {
    return analysis
      .replace(/\{awayTeam\}/g, game.awayTeam.displayName)
      .replace(/\{homeTeam\}/g, game.homeTeam.displayName)
  }

  /**
   * Personalize prediction text with actual team names
   */
  private personalizePrediction(prediction: string, game: NFLGame): string {
    return prediction
      .replace(/\{awayTeam\}/g, game.awayTeam.displayName)
      .replace(/\{homeTeam\}/g, game.homeTeam.displayName)
  }

  /**
   * Get small random variance for confidence
   */
  private getVarianceAdjustment(): number {
    return (Math.random() - 0.5) * 2 // -1 to +1
  }

  /**
   * Conservative strategy templates
   */
  private getConservativeTemplates(): MockParlayTemplate[] {
    return [
      {
        legs: [
          {
            betType: 'spread',
            selection: '{homeTeam} +7.5',
            target: '+7.5',
            reasoning:
              'Home underdog getting significant points in what should be a competitive game.',
            confidence: 7,
            odds: '-110',
          },
          {
            betType: 'total',
            selection: 'Under 42.5',
            target: '42.5',
            reasoning:
              'Defensive matchup with weather concerns likely to limit scoring.',
            confidence: 6,
            odds: '-105',
          },
        ],
        aiReasoning:
          'Conservative approach focusing on safe margins and defensive game script.',
        overallConfidence: 7,
        estimatedOdds: '+264',
        gameSummary: {
          matchupAnalysis:
            '{awayTeam} vs {homeTeam} features strong defensive units that could limit offensive production.',
          gameFlow: 'defensive_grind',
          keyFactors: [
            'Defensive strength',
            'Weather conditions',
            'Conservative game plan',
          ],
          prediction:
            'Low-scoring, defensive battle with {homeTeam} keeping it competitive.',
          confidence: 7,
        },
      },
    ]
  }

  /**
   * Balanced strategy templates
   */
  private getBalancedTemplates(): MockParlayTemplate[] {
    return [
      {
        legs: [
          {
            betType: 'spread',
            selection: '{awayTeam} -3.5',
            target: '-3.5',
            reasoning:
              'Road favorite in a pick-em game with slight edge in key matchups.',
            confidence: 6,
            odds: '-110',
          },
          {
            betType: 'total',
            selection: 'Over 45.5',
            target: '45.5',
            reasoning:
              'Both offenses have shown consistency, expect moderate scoring.',
            confidence: 6,
            odds: '-110',
          },
        ],
        aiReasoning:
          'Balanced approach combining point spread value with moderate total expectations.',
        overallConfidence: 6,
        estimatedOdds: '+264',
        gameSummary: {
          matchupAnalysis:
            'Even matchup between {awayTeam} and {homeTeam} with slight edge to visiting team.',
          gameFlow: 'balanced_tempo',
          keyFactors: [
            'Point spread value',
            'Offensive consistency',
            'Key player matchups',
          ],
          prediction: 'Competitive game with {awayTeam} covering small spread.',
          confidence: 6,
        },
      },
    ]
  }

  /**
   * Aggressive strategy templates
   */
  private getAggressiveTemplates(): MockParlayTemplate[] {
    return [
      {
        legs: [
          {
            betType: 'spread',
            selection: '{homeTeam} -10.5',
            target: '-10.5',
            reasoning:
              'Home favorite expected to dominate weaker opponent in potential blowout.',
            confidence: 5,
            odds: '-110',
          },
          {
            betType: 'total',
            selection: 'Over 52.5',
            target: '52.5',
            reasoning:
              'High-powered offenses in dome environment, expect fireworks.',
            confidence: 6,
            odds: '-110',
          },
          {
            betType: 'player_prop',
            selection: 'QB 300+ passing yards',
            target: '300',
            reasoning:
              'Elite quarterback in favorable matchup against weak secondary.',
            confidence: 5,
            odds: '-125',
          },
        ],
        aiReasoning:
          'Aggressive three-leg parlay targeting high-upside scenarios for maximum payout.',
        overallConfidence: 5,
        estimatedOdds: '+595',
        gameSummary: {
          matchupAnalysis:
            '{homeTeam} heavily favored against {awayTeam} in what could be a one-sided affair.',
          gameFlow: 'potential_blowout',
          keyFactors: [
            'Talent disparity',
            'Home field advantage',
            'Pace of play',
          ],
          prediction: '{homeTeam} dominates in high-scoring blowout victory.',
          confidence: 5,
        },
      },
    ]
  }

  /**
   * Player-focused strategy templates
   */
  private getPlayerFocusedTemplates(): MockParlayTemplate[] {
    return [
      {
        legs: [
          {
            betType: 'player_prop',
            selection: 'QB 250+ passing yards',
            target: '250',
            reasoning:
              'Starting quarterback averaging 280 yards per game this season.',
            confidence: 7,
            odds: '-120',
          },
          {
            betType: 'player_prop',
            selection: 'RB 75+ rushing yards',
            target: '75',
            reasoning:
              'Feature back facing favorable run defense, should see 20+ carries.',
            confidence: 6,
            odds: '-115',
          },
        ],
        aiReasoning:
          'Player-focused parlay targeting statistical production from key skill position players.',
        overallConfidence: 6,
        estimatedOdds: '+264',
        gameSummary: {
          matchupAnalysis:
            'Key players for both {awayTeam} and {homeTeam} set up for productive fantasy performances.',
          gameFlow: 'balanced_tempo',
          keyFactors: [
            'Player usage rates',
            'Matchup advantages',
            'Game script expectations',
          ],
          prediction:
            'Statistical production game with multiple players hitting props.',
          confidence: 6,
        },
      },
    ]
  }
}

export default MockProvider
