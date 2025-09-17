import { BetType, GeneratedParlay, NFLGame, ParlayLeg } from '../types'

// Simple strategy config for mock service
interface StrategyConfig {
  name: string
  description: string
  temperature: number
  riskProfile: 'low' | 'medium' | 'high'
  confidenceRange: [number, number]
}

interface VarietyFactors {
  strategy: string
  focusArea: string
  playerTier: string
  gameScript: string
  marketBias: string
}

/**
 * Mock parlay template for generating realistic test data
 */
interface MockParlayTemplate {
  legs: Array<{
    betType: BetType
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
 * Enhanced Mock OpenAI Service
 * Provides realistic parlay generation for development and testing
 * Supports strategy-aware generation and configurable behavior
 */
export class MockOpenAIService {
  private config = {
    errorRate: parseFloat(import.meta.env.VITE_MOCK_ERROR_RATE || '0.05'),
    minDelay: parseInt(import.meta.env.VITE_MOCK_DELAY_MIN || '1000'),
    maxDelay: parseInt(import.meta.env.VITE_MOCK_DELAY_MAX || '2500'),
    showDebugInfo: import.meta.env.MODE === 'development',
  }

  /**
   * Generate a mock parlay (simplified interface for compatibility)
   */
  async generateParlay(game: NFLGame): Promise<GeneratedParlay> {
    if (!this.isEnabled()) {
      throw new Error('Mock OpenAI service is disabled in this environment')
    }

    if (this.config.showDebugInfo) {
      console.log(
        '🎭 Mock Service: Generating parlay for',
        game.awayTeam.displayName,
        '@',
        game.homeTeam.displayName
      )
    }

    // Simulate realistic API delay
    const delay =
      Math.random() * (this.config.maxDelay - this.config.minDelay) +
      this.config.minDelay
    await new Promise(resolve => setTimeout(resolve, delay))

    // Simulate API errors for testing
    if (Math.random() < this.config.errorRate) {
      throw new Error(
        '🎭 MOCK API ERROR: Simulated failure for testing error handling'
      )
    }

    // Generate mock parlay with default strategy
    const strategy = this.getDefaultStrategy()
    const template = this.selectTemplateByStrategy(strategy)
    const parlay = this.generateFromTemplate(template, game, strategy)

    return parlay
  }

  /**
   * Check if mock service should be used
   */
  private isEnabled(): boolean {
    return (
      import.meta.env.MODE === 'development' ||
      import.meta.env.VITE_USE_MOCK_OPENAI === 'true'
    )
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
      strategy.riskProfile === 'high' ||
      strategy.name.toLowerCase().includes('aggressive')
    ) {
      return AGGRESSIVE_MOCK_TEMPLATES
    }

    if (
      strategy.name.toLowerCase().includes('player') ||
      strategy.name.toLowerCase().includes('prop')
    ) {
      return PLAYER_FOCUSED_MOCK_TEMPLATES
    }

    if (
      strategy.riskProfile === 'low' ||
      strategy.name.toLowerCase().includes('conservative')
    ) {
      return CONSERVATIVE_MOCK_TEMPLATES
    }

    return BALANCED_MOCK_TEMPLATES
  }

  /**
   * Generate parlay from template with game-specific substitutions
   */
  private generateFromTemplate(
    template: MockParlayTemplate,
    game: NFLGame,
    strategy: StrategyConfig
  ): GeneratedParlay {
    const substituted = this.substitutePlaceholders(template, game)

    // Ensure we have exactly 3 legs
    if (substituted.legs.length !== 3) {
      throw new Error('Template must have exactly 3 legs')
    }

    const legs: [ParlayLeg, ParlayLeg, ParlayLeg] = substituted.legs.map(
      (leg, index) => ({
        id: `mock-leg-${Date.now()}-${index}`,
        betType: leg.betType,
        selection: leg.selection,
        target: leg.target,
        reasoning: leg.reasoning,
        confidence: this.adjustConfidenceForStrategy(leg.confidence, strategy),
        odds: leg.odds,
      })
    ) as [ParlayLeg, ParlayLeg, ParlayLeg]

    const parlay: GeneratedParlay = {
      id: `🎭-MOCK-PARLAY-${Date.now()}`,
      legs,
      gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - Week ${game.week} (MOCK DATA)`,
      aiReasoning: `🎭 MOCK: ${substituted.aiReasoning} (Strategy: ${strategy.name})`,
      overallConfidence: this.adjustConfidenceForStrategy(
        substituted.overallConfidence,
        strategy
      ),
      estimatedOdds: this.calculateParlayOdds(legs.map(leg => leg.odds)),
      createdAt: new Date().toISOString(),
      gameSummary: {
        ...substituted.gameSummary,
        matchupAnalysis: `🎭 MOCK: ${substituted.gameSummary.matchupAnalysis}`,
        prediction: `🎭 MOCK: ${substituted.gameSummary.prediction}`,
      },
    }

    return parlay
  }

  /**
   * Substitute template placeholders with actual game data
   */
  private substitutePlaceholders(
    template: MockParlayTemplate,
    game: NFLGame
  ): MockParlayTemplate {
    const homeTeam = game.homeTeam.displayName
    const awayTeam = game.awayTeam.displayName
    const week = game.week

    // Replace placeholders in template
    const substituteText = (text: string): string => {
      return text
        .replace(/{HOME_TEAM}/g, homeTeam)
        .replace(/{AWAY_TEAM}/g, awayTeam)
        .replace(/{WEEK}/g, week.toString())
        .replace(
          /{HOME_CITY}/g,
          homeTeam.split(' ').slice(0, -1).join(' ') || homeTeam
        )
        .replace(
          /{AWAY_CITY}/g,
          awayTeam.split(' ').slice(0, -1).join(' ') || awayTeam
        )
    }

    return {
      legs: template.legs.map(leg => ({
        ...leg,
        selection: substituteText(leg.selection),
        target: substituteText(leg.target),
        reasoning: substituteText(leg.reasoning),
      })),
      aiReasoning: substituteText(template.aiReasoning),
      overallConfidence: template.overallConfidence,
      estimatedOdds: template.estimatedOdds,
      gameSummary: {
        ...template.gameSummary,
        matchupAnalysis: substituteText(template.gameSummary.matchupAnalysis),
        keyFactors: template.gameSummary.keyFactors.map(substituteText),
        prediction: substituteText(template.gameSummary.prediction),
      },
    }
  }

  /**
   * Adjust confidence based on strategy risk profile
   */
  private adjustConfidenceForStrategy(
    baseConfidence: number,
    strategy: StrategyConfig
  ): number {
    let adjustment = 0

    if (strategy.riskProfile === 'high') {
      adjustment = -1 // Lower confidence for high risk
    } else if (strategy.riskProfile === 'low') {
      adjustment = 1 // Higher confidence for conservative
    }

    return Math.min(Math.max(baseConfidence + adjustment, 1), 10)
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

  async generateParlayWithOptions(
    game: NFLGame,
    options: {
      strategy?: StrategyConfig
      varietyFactors?: VarietyFactors
      temperature?: number
      debugMode?: boolean
    } = {}
  ): Promise<GeneratedParlay> {
    if (!this.isEnabled()) {
      throw new Error('Mock OpenAI service is disabled in this environment')
    }

    if (options.debugMode || this.config.showDebugInfo) {
      console.log(
        '🎭 Mock Service: Generating parlay for',
        game.awayTeam.displayName,
        '@',
        game.homeTeam.displayName,
        options.strategy ? `(Strategy: ${options.strategy.name})` : ''
      )
    }

    // Simulate realistic API delay
    const delay =
      Math.random() * (this.config.maxDelay - this.config.minDelay) +
      this.config.minDelay
    await new Promise(resolve => setTimeout(resolve, delay))

    // Simulate API errors for testing
    if (Math.random() < this.config.errorRate) {
      throw new Error(
        '🎭 MOCK API ERROR: Simulated failure for testing error handling'
      )
    }

    // Generate strategy-aware parlay
    const strategy = options.strategy || this.getDefaultStrategy()
    const varietyFactors =
      options.varietyFactors || this.generateMockVarietyFactors() // NOW USED!

    if (options.debugMode) {
      console.log('🎭 Using variety factors:', varietyFactors)
    }

    const template = this.selectTemplateByStrategy(strategy)
    const parlay = this.generateFromTemplate(template, game, strategy)

    return parlay
  }

  /**
   * Generate mock variety factors
   */
  private generateMockVarietyFactors(): VarietyFactors {
    const strategies = [
      'conservative',
      'aggressive',
      'player_focused',
      'team_focused',
    ]
    const focusAreas = ['offense', 'defense', 'balanced']
    const gameScripts = ['high_scoring', 'defensive', 'close_game']
    const playerTiers = ['star', 'role_player', 'breakout_candidate', 'veteran']
    const marketBiases = [
      'public_favorite',
      'sharp_play',
      'contrarian',
      'neutral',
    ]

    return {
      strategy: strategies[Math.floor(Math.random() * strategies.length)],
      focusArea: focusAreas[Math.floor(Math.random() * focusAreas.length)],
      playerTier: playerTiers[Math.floor(Math.random() * playerTiers.length)],
      gameScript: gameScripts[Math.floor(Math.random() * gameScripts.length)],
      marketBias: marketBiases[Math.floor(Math.random() * marketBiases.length)],
    }
  }

  /**
   * Get default strategy for when none is provided
   */
  private getDefaultStrategy(): StrategyConfig {
    return {
      name: 'Balanced Mock',
      description: 'Balanced approach for mock testing',
      temperature: 0.7,
      riskProfile: 'medium',
      confidenceRange: [6, 8],
    }
  }

  /**
   * Check if mock service should be used (public method)
   */
  shouldUseMock(): boolean {
    return this.isEnabled()
  }
}

// ===== MOCK TEMPLATE DEFINITIONS =====

const CONSERVATIVE_MOCK_TEMPLATES: MockParlayTemplate[] = [
  {
    legs: [
      {
        betType: 'spread',
        selection: '{HOME_TEAM}',
        target: '-3.5 points',
        reasoning:
          '{HOME_TEAM} has been solid at home this season, covering 70% of their home spreads. Their defense has allowed 18 points per game at home.',
        confidence: 8,
        odds: '-110',
      },
      {
        betType: 'total',
        selection: 'Under',
        target: 'Under 44.5 points',
        reasoning:
          'Both teams rank in the top 10 defensively, and weather conditions favor a lower-scoring affair.',
        confidence: 7,
        odds: '-105',
      },
      {
        betType: 'player_prop',
        selection: 'Starting QB',
        target: 'Over 225.5 passing yards',
        reasoning:
          'QB has thrown for 250+ yards in 4 of last 5 games and faces a secondary allowing 240 yards per game.',
        confidence: 7,
        odds: '-115',
      },
    ],
    aiReasoning:
      'Conservative approach focusing on home field advantage, defensive trends, and reliable quarterback production.',
    overallConfidence: 7,
    estimatedOdds: '+280',
    gameSummary: {
      matchupAnalysis:
        '{HOME_TEAM} defense at home vs {AWAY_TEAM} offense creates a favorable matchup for the home side.',
      gameFlow: 'defensive_grind',
      keyFactors: [
        'Home field advantage',
        'Defensive strength',
        'Weather conditions',
      ],
      prediction:
        'Expect a defensive battle with {HOME_TEAM} controlling the game at home.',
      confidence: 7,
    },
  },
]

const AGGRESSIVE_MOCK_TEMPLATES: MockParlayTemplate[] = [
  {
    legs: [
      {
        betType: 'player_prop',
        selection: 'Star WR',
        target: 'Over 85.5 receiving yards',
        reasoning:
          'Elite receiver facing a secondary that has allowed 300+ passing yards in 3 straight games. Expect heavy target share.',
        confidence: 6,
        odds: '+110',
      },
      {
        betType: 'player_prop',
        selection: 'Starting RB',
        target: 'Anytime touchdown',
        reasoning:
          '{AWAY_TEAM} RB has scored in 6 of 8 games this season and faces a run defense allowing 4.8 yards per carry.',
        confidence: 5,
        odds: '-140',
      },
      {
        betType: 'total',
        selection: 'Over',
        target: 'Over 52.5 points',
        reasoning:
          'Both offenses rank in top 12 in scoring. Weather is clear and both teams have explosive capability.',
        confidence: 6,
        odds: '-105',
      },
    ],
    aiReasoning:
      'High-upside approach targeting explosive plays and touchdown potential in a high-scoring environment.',
    overallConfidence: 6,
    estimatedOdds: '+420',
    gameSummary: {
      matchupAnalysis:
        'Two high-powered offenses create opportunities for explosive plays and scoring bursts.',
      gameFlow: 'high_scoring_shootout',
      keyFactors: [
        'Offensive firepower',
        'Defensive vulnerabilities',
        'Big play potential',
      ],
      prediction:
        'Anticipate an entertaining back-and-forth affair with multiple scoring drives.',
      confidence: 6,
    },
  },
]

const PLAYER_FOCUSED_MOCK_TEMPLATES: MockParlayTemplate[] = [
  {
    legs: [
      {
        betType: 'player_prop',
        selection: 'Starting QB',
        target: 'Over 1.5 passing touchdowns',
        reasoning:
          'QB has thrown 2+ TDs in 7 of 9 games and faces a defense allowing 1.8 passing TDs per game.',
        confidence: 7,
        odds: '-130',
      },
      {
        betType: 'player_prop',
        selection: 'Top WR',
        target: 'Over 5.5 receptions',
        reasoning:
          'Primary target with 25% target share facing a defense that allows 6.2 receptions per game to WR1s.',
        confidence: 6,
        odds: '-105',
      },
      {
        betType: 'player_prop',
        selection: 'Starting RB',
        target: 'Over 65.5 rushing yards',
        reasoning:
          'Feature back averaging 85 yards per game with a favorable matchup against a run defense allowing 4.5 YPC.',
        confidence: 6,
        odds: '-110',
      },
    ],
    aiReasoning:
      'Player performance focus targeting consistent statistical producers with favorable individual matchups.',
    overallConfidence: 6,
    estimatedOdds: '+350',
    gameSummary: {
      matchupAnalysis:
        'Individual player matchups create opportunities for statistical production across multiple positions.',
      gameFlow: 'balanced_tempo',
      keyFactors: [
        'Target share analysis',
        'Individual matchups',
        'Usage trends',
      ],
      prediction:
        'Key players should find opportunities to reach statistical benchmarks.',
      confidence: 6,
    },
  },
]

const BALANCED_MOCK_TEMPLATES: MockParlayTemplate[] = [
  {
    legs: [
      {
        betType: 'spread',
        selection: '{AWAY_TEAM}',
        target: '+7.5 points',
        reasoning:
          'Road team has covered 60% of games this season and gets significant points in a rivalry matchup.',
        confidence: 7,
        odds: '-110',
      },
      {
        betType: 'player_prop',
        selection: 'Starting QB',
        target: 'Over 250.5 passing yards',
        reasoning:
          'QB has exceeded 250 yards in 6 of 8 road games and faces a pass defense allowing 255 yards per game.',
        confidence: 6,
        odds: '-105',
      },
      {
        betType: 'total',
        selection: 'Over',
        target: 'Over 45.5 points',
        reasoning:
          'Total has gone over in 4 of last 5 meetings between these teams, with both offenses healthy.',
        confidence: 6,
        odds: '-110',
      },
    ],
    aiReasoning:
      'Balanced approach combining point spread value, quarterback production, and historical scoring trends.',
    overallConfidence: 6,
    estimatedOdds: '+320',
    gameSummary: {
      matchupAnalysis:
        'Well-matched teams create opportunities for competitive game flow and statistical production.',
      gameFlow: 'balanced_tempo',
      keyFactors: [
        'Point spread value',
        'Historical trends',
        'Offensive consistency',
      ],
      prediction: 'Competitive game with scoring opportunities for both teams.',
      confidence: 6,
    },
  },
]

// Export singleton instance
export const mockOpenAIService = new MockOpenAIService()
