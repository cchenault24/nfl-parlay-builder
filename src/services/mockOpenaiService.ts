import {
  BetType,
  GameSummary,
  GeneratedParlay,
  NFLGame,
  ParlayLeg,
} from '../types'

/**
 * Mock OpenAI Service for Development Environment
 * Saves API costs while maintaining realistic responses including AI game analysis
 */

interface MockParlayData {
  legs: Array<{
    betType: BetType
    selection: string
    target: string
    odds: string
    reasoning: string
    confidence: number
    playerName?: string
    team?: string
    statType?: string
    line?: number
    prediction?: string
  }>
  aiReasoning: string
  overallConfidence: number
  gameSummary: {
    matchupAnalysis: string
    gameFlow: GameSummary['gameFlow']
    keyFactors: string[]
    prediction: string
    confidence: number
  }
}

// Pre-defined mock parlay templates with OBVIOUS mock indicators
const MOCK_PARLAY_TEMPLATES: MockParlayData[] = [
  {
    legs: [
      {
        betType: 'spread',
        selection: 'TEAM_HOME',
        target: '-3.5 points',
        odds: '-110',
        reasoning:
          'MOCK DATA: Home team has strong rushing attack vs weak run defense. This is fake analysis for development!',
        confidence: 7,
        prediction: 'cover',
      },
      {
        betType: 'total',
        selection: 'Combined',
        target: 'Over 47.5 points',
        odds: '-105',
        reasoning:
          'MOCK DATA: Both teams rank in top 10 for offensive yards per game. This is simulated analysis!',
        confidence: 6,
        prediction: 'over',
      },
      {
        betType: 'player_prop',
        selection: 'PLAYER_QB',
        target: 'Over 250.5 passing yards',
        odds: '-120',
        reasoning:
          'MOCK DATA: QB has averaged 275 yards vs similar defenses. This is fake player analysis!',
        confidence: 8,
        playerName: 'PLAYER_QB',
        team: 'TEAM_HOME',
        statType: 'passing_yards',
        line: 250.5,
        prediction: 'over',
      },
    ],
    aiReasoning:
      'MOCK AI REASONING: Conservative approach focusing on statistical trends and matchup advantages. THIS IS FAKE ANALYSIS FOR DEVELOPMENT PURPOSES!',
    overallConfidence: 7,
    gameSummary: {
      matchupAnalysis:
        'MOCK ANALYSIS: TEAM_HOME enters this matchup with a significant advantage in the trenches. This is completely simulated data for development testing! The home team has averaged 4.8 yards per carry over their last four games (fake stat), while TEAM_AWAY has allowed 5.2 YPC in the same span (also fake). Weather conditions appear favorable for both passing games, with temperatures in the mid-60s and light winds (simulated weather data).',
      gameFlow: 'balanced_tempo',
      keyFactors: [
        'MOCK: TEAM_HOME rushing attack vs TEAM_AWAY run defense mismatch',
        'MOCK: Weather conditions favoring aerial attacks (fake weather)',
        'MOCK: TEAM_AWAY secondary vulnerable to deep passes (simulated)',
        'MOCK: Home field advantage in primetime game (fake scenario)',
        'MOCK: Both teams coming off bye weeks (simulated schedule)',
      ],
      prediction:
        'MOCK PREDICTION: Expect TEAM_HOME to establish the ground game early and control the pace. This is completely fake analysis for development purposes! TEAM_AWAY will be forced into passing situations, creating opportunities for explosive plays (simulated scenario).',
      confidence: 7,
    },
  },
  {
    legs: [
      {
        betType: 'moneyline',
        selection: 'TEAM_AWAY',
        target: 'TEAM_AWAY ML',
        odds: '+165',
        reasoning:
          'MOCK DATA: Away team has better record in divisional games. This is fake divisional analysis!',
        confidence: 6,
        prediction: 'win',
      },
      {
        betType: 'player_prop',
        selection: 'PLAYER_RB',
        target: 'Over 75.5 rushing yards',
        odds: '-115',
        reasoning:
          'MOCK DATA: RB has exceeded 75 yards in 6 of last 8 games (fake stats). Opposing defense allows 4.2 YPC (simulated).',
        confidence: 7,
        playerName: 'PLAYER_RB',
        team: 'TEAM_AWAY',
        statType: 'rushing_yards',
        line: 75.5,
        prediction: 'over',
      },
      {
        betType: 'player_prop',
        selection: 'PLAYER_WR',
        target: 'Over 6.5 receptions',
        odds: '+105',
        reasoning:
          'MOCK DATA: WR is primary target in red zone (fake analysis). Expect high target share in potential shootout!',
        confidence: 6,
        playerName: 'PLAYER_WR',
        team: 'TEAM_HOME',
        statType: 'receptions',
        line: 6.5,
        prediction: 'over',
      },
    ],
    aiReasoning:
      'MOCK AI REASONING: Value-focused approach targeting undervalued away team and prop correlations. THIS IS SIMULATED ANALYSIS FOR TESTING!',
    overallConfidence: 6,
    gameSummary: {
      matchupAnalysis:
        'MOCK ANALYSIS: This divisional rivalry game presents excellent value on the road underdog (fake scenario). TEAM_AWAY has historically performed well in hostile environments, going 4-1 ATS in their last 5 road divisional games (completely made up stats). Their offensive line has been much improved, allowing only 1.2 sacks per game over the last month (simulated data). This is all fake analysis for development!',
      gameFlow: 'high_scoring_shootout',
      keyFactors: [
        'MOCK: TEAM_AWAY strong road performance in division (fake)',
        'MOCK: Improved offensive line protection (simulated stat)',
        'MOCK: TEAM_HOME defense struggles vs mobile QBs (fake analysis)',
        'MOCK: Weather may neutralize advantages (simulated weather)',
        'MOCK: High stakes divisional game (fake scenario)',
      ],
      prediction:
        "MOCK PREDICTION: This has all the makings of a classic divisional shootout (completely simulated scenario). TEAM_AWAY's improved offensive line and TEAM_HOME's defensive vulnerabilities create an opportunity for the road team to steal a victory. This is fake AI prediction for development testing!",
      confidence: 6,
    },
  },
  {
    legs: [
      {
        betType: 'total',
        selection: 'Combined',
        target: 'Under 44.5 points',
        odds: '-110',
        reasoning:
          'MOCK DATA: Both defenses rank top 12 in points allowed (fake ranking). Rain expected to limit aerial attacks (simulated weather)!',
        confidence: 7,
        prediction: 'under',
      },
      {
        betType: 'spread',
        selection: 'TEAM_AWAY',
        target: '+7.5 points',
        odds: '-105',
        reasoning:
          'MOCK DATA: Large spread for divisional matchup (fake scenario). Away team covers 70% as road underdog (made up stat)!',
        confidence: 8,
        prediction: 'cover',
      },
      {
        betType: 'player_prop',
        selection: 'PLAYER_QB',
        target: 'Under 1.5 passing TDs',
        odds: '+130',
        reasoning:
          'MOCK DATA: Red zone struggles continue vs strong goal line defense (fake analysis). Weather may force ground game!',
        confidence: 5,
        playerName: 'PLAYER_QB',
        team: 'TEAM_AWAY',
        statType: 'passing_touchdowns',
        line: 1.5,
        prediction: 'under',
      },
    ],
    aiReasoning:
      'MOCK AI REASONING: Weather-aware defensive strategy. Targeting unders and large spreads based on environmental factors. THIS IS COMPLETELY SIMULATED FOR DEVELOPMENT!',
    overallConfidence: 6,
    gameSummary: {
      matchupAnalysis:
        "MOCK ANALYSIS: Weather will be the story in this matchup, with steady rain and 15+ mph winds expected throughout the game (completely fake weather forecast). Both teams feature top-12 defenses (fake rankings) that have been dominant at home this season. TEAM_HOME's defense has allowed only 18.2 points per game at home (made up stat), while TEAM_AWAY has been equally stingy on the road. This is all simulated data for testing!",
      gameFlow: 'defensive_grind',
      keyFactors: [
        'MOCK: Steady rain and strong winds forecasted (fake weather)',
        'MOCK: Both teams feature top-12 defenses (fake rankings)',
        'MOCK: Emphasis on ground game due to weather (simulated)',
        'MOCK: QBs have struggled in adverse conditions (fake stat)',
        'MOCK: Historical low-scoring games between teams (made up)',
      ],
      prediction:
        'MOCK PREDICTION: Expect a classic defensive struggle with weather playing a major factor (completely simulated scenario). The under should hit comfortably as both teams rely heavily on their ground games. This is fake AI prediction for development purposes only!',
      confidence: 7,
    },
  },
]

// Mock player names that are obviously fake
const MOCK_PLAYER_POOLS = {
  QB: [
    'Mock Quarterback',
    'Fake QB Jones',
    'Test Signal-Caller',
    'Dev Passer',
    'Mock Brady',
    'Fake Mahomes',
  ],
  RB: [
    'Mock Runner',
    'Fake Rusher',
    'Test Backfield',
    'Dev Groundgame',
    'Mock Henry',
    'Fake Barkley',
  ],
  WR: [
    'Mock Receiver',
    'Fake Wideout',
    'Test Target',
    'Dev Catcher',
    'Mock Adams',
    'Fake Hill',
  ],
  TE: [
    'Mock Tight-End',
    'Fake Blocker',
    'Test Target',
    'Dev Receiver',
    'Mock Kelce',
    'Fake Kittle',
  ],
}

/**
 * Get an obviously fake player name
 */
function getMockPlayer(position: string): string {
  // Always use mock names to make it obvious
  const pool =
    MOCK_PLAYER_POOLS[position as keyof typeof MOCK_PLAYER_POOLS] ||
    MOCK_PLAYER_POOLS.QB
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * Substitute template placeholders with actual game data but keep mock indicators
 */
function substitutePlaceholders(
  template: MockParlayData,
  game: NFLGame
): MockParlayData {
  const substituted = JSON.parse(JSON.stringify(template)) as MockParlayData

  // Substitute team names in legs
  substituted.legs.forEach((leg: MockParlayData['legs'][0]) => {
    // Replace team placeholders in selection
    leg.selection = leg.selection
      .replace(/TEAM_HOME/g, game.homeTeam.displayName)
      .replace(/TEAM_AWAY/g, game.awayTeam.displayName)

    // Replace team placeholders in target
    leg.target = leg.target
      .replace(/TEAM_HOME/g, game.homeTeam.displayName)
      .replace(/TEAM_AWAY/g, game.awayTeam.displayName)

    // Replace player placeholders with MOCK players
    leg.selection = leg.selection.replace(
      /PLAYER_(\w+)/g,
      (match: string, position: string) => {
        const playerName = getMockPlayer(position)
        if (leg.playerName === match) {
          leg.playerName = playerName
        }
        return playerName
      }
    )

    // Update reasoning with team names
    leg.reasoning = leg.reasoning
      .replace(/TEAM_HOME/g, game.homeTeam.displayName)
      .replace(/TEAM_AWAY/g, game.awayTeam.displayName)
  })

  // Substitute team names in game summary
  substituted.gameSummary.matchupAnalysis =
    substituted.gameSummary.matchupAnalysis
      .replace(/TEAM_HOME/g, game.homeTeam.displayName)
      .replace(/TEAM_AWAY/g, game.awayTeam.displayName)

  substituted.gameSummary.prediction = substituted.gameSummary.prediction
    .replace(/TEAM_HOME/g, game.homeTeam.displayName)
    .replace(/TEAM_AWAY/g, game.awayTeam.displayName)

  substituted.gameSummary.keyFactors = substituted.gameSummary.keyFactors.map(
    factor =>
      factor
        .replace(/TEAM_HOME/g, game.homeTeam.displayName)
        .replace(/TEAM_AWAY/g, game.awayTeam.displayName)
  )

  return substituted
}

/**
 * Calculate parlay odds from individual leg odds
 */
function calculateParlayOdds(individualOdds: string[]): string {
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

  // Return as string with proper formatting
  return americanOdds > 0 ? `+${americanOdds}` : `${americanOdds}`
}

/**
 * Mock OpenAI Service Implementation
 */
export class MockOpenAIService {
  private isEnabled(): boolean {
    return (
      import.meta.env.MODE === 'development' ||
      import.meta.env.VITE_USE_MOCK_OPENAI === 'true'
    )
  }

  /**
   * Generate a mock parlay with OBVIOUS mock indicators
   */
  async generateParlay(game: NFLGame): Promise<GeneratedParlay> {
    if (!this.isEnabled()) {
      throw new Error('Mock OpenAI service is disabled in this environment')
    }

    // Simulate API delay for realistic development experience
    await new Promise(resolve =>
      setTimeout(resolve, 1500 + Math.random() * 1000)
    )

    // Random chance of "API error" for testing error handling
    if (Math.random() < 0.05) {
      // 5% chance
      throw new Error(
        'MOCK API ERROR: This is a simulated error for testing purposes!'
      )
    }

    // Select random template and substitute placeholders
    const templateIndex = Math.floor(
      Math.random() * MOCK_PARLAY_TEMPLATES.length
    )
    const template = MOCK_PARLAY_TEMPLATES[templateIndex]
    const substituted = substitutePlaceholders(template, game)

    // Ensure we have exactly 3 legs and convert to expected format
    if (substituted.legs.length !== 3) {
      throw new Error('Template must have exactly 3 legs')
    }

    const legs: ParlayLeg[] = substituted.legs.map((leg, index) => ({
      id: `mock-leg-${Date.now()}-${index}`, // Mock ID
      betType: leg.betType,
      selection: leg.selection,
      target: leg.target,
      reasoning: leg.reasoning,
      confidence: leg.confidence,
      odds: leg.odds,
    }))

    // Type assertion to ensure we have exactly 3 legs
    const typedLegs = legs as [ParlayLeg, ParlayLeg, ParlayLeg]

    const individualOdds = typedLegs.map(leg => leg.odds)
    const estimatedOdds = calculateParlayOdds(individualOdds)

    // Create game summary with mock indicators
    const gameSummary: GameSummary = {
      matchupAnalysis: substituted.gameSummary.matchupAnalysis,
      gameFlow: substituted.gameSummary.gameFlow,
      keyFactors: substituted.gameSummary.keyFactors,
      prediction: substituted.gameSummary.prediction,
      confidence: substituted.gameSummary.confidence,
    }

    const parlay: GeneratedParlay = {
      id: `🎭-MOCK-PARLAY-${Date.now()}`, // Obviously mock ID
      legs: typedLegs,
      gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - Week ${game.week} (MOCK DATA)`,
      aiReasoning: substituted.aiReasoning,
      overallConfidence: substituted.overallConfidence,
      estimatedOdds,
      createdAt: new Date().toISOString(),
      gameSummary,
    }

    return parlay
  }

  /**
   * Check if mock service should be used
   */
  shouldUseMock(): boolean {
    return this.isEnabled()
  }
}

// Export singleton instance
export const mockOpenAIService = new MockOpenAIService()
