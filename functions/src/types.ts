/**
 * Shared types for Firebase Functions
 * These mirror the types from your client-side application
 */

// === NFL Game Types ===
export interface NFLTeam {
  id: string
  abbreviation: string
  displayName: string
  shortDisplayName: string
  color: string
  alternateColor: string
  logo: string
}

export interface NFLGame {
  id: string
  week: number
  seasonType: number
  homeTeam: NFLTeam
  awayTeam: NFLTeam
  date: string
  status: {
    type: {
      id: string
      name: string
      state: string
      completed: boolean
    }
  }
}

// === Player Types ===
export interface NFLPlayer {
  id: string
  fullName: string
  displayName: string
  shortName: string
  position: {
    abbreviation: string
    displayName: string
  }
  jersey: string
  experience: {
    years: number
  }
  age: number
  status: {
    type: string
  }
}

// === Parlay Types ===
export type BetType =
  | 'spread'
  | 'total'
  | 'moneyline'
  | 'player_prop'
  | 'player_passing'
  | 'player_rushing'
  | 'player_receiving'
  | 'team_total'
  | 'first_touchdown'
  | 'defensive_props'

export interface ParlayLeg {
  id: string
  betType: BetType
  selection: string
  target: string
  reasoning: string
  confidence: number
  odds: string
}

export interface GameSummary {
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

export interface GeneratedParlay {
  id: string
  legs: [ParlayLeg, ParlayLeg, ParlayLeg]
  gameContext: string
  aiReasoning: string
  overallConfidence: number
  estimatedOdds: string
  createdAt: string
  gameSummary: GameSummary
  metadata?: {
    provider: string
    model: string
    generatedAt: string
    varietyScore?: number
    templateRisk?: 'low' | 'medium' | 'high'
  }
}

export interface GameRosters {
  homeRoster: NFLPlayer[]
  awayRoster: NFLPlayer[]
}

// === Enhanced variety factors for sophisticated parlay generation ===
export interface VarietyFactors {
  strategy: string
  focusArea: 'offense' | 'defense' | 'special_teams' | 'balanced'
  gameScript: 'high_scoring' | 'defensive' | 'blowout' | 'close_game'
  focusPlayer?: NFLPlayer | null
  riskTolerance: number // 0.0 to 1.0

  // Enhanced factors
  playerTier?: 'star' | 'role_player' | 'breakout_candidate' | 'veteran'
  marketBias?: 'public_favorite' | 'sharp_play' | 'contrarian' | 'neutral'
  timeContext?: 'early_season' | 'mid_season' | 'late_season' | 'playoffs'
  motivationalFactors?: string[]
}

// === Enhanced strategy configuration ===
export interface StrategyConfig {
  name: string
  description: string
  temperature: number
  focusAreas: string[]
  riskLevel: 'conservative' | 'moderate' | 'aggressive'

  // Enhanced properties
  betTypeWeights?: Record<string, number>
  contextFactors?: string[]
  confidenceRange?: [number, number]
  preferredGameScripts?: string[]
}

// === Cloud Function Request/Response Types ===
// Add these to your GenerateParlayRequest interface
export interface GenerateParlayRequest {
  game: NFLGame
  rosters: GameRosters
  strategy?: StrategyConfig
  varietyFactors?: VarietyFactors
  options?: {
    temperature?: number
    strategy?: string
    provider?: string
  }
}

export interface GenerateParlayResponse {
  success: boolean
  data?: GeneratedParlay
  error?: {
    code: string
    message: string
    details?: any
  }
  rateLimitInfo?: {
    remaining: number
    resetTime: string
    currentCount: number
    total: number
  }
  metadata?: {
    provider: string
    generatedAt: string
    rateLimitInfo: {
      remaining: number
      resetTime: string
    }
    aiProvider?: string
    model?: string
    tokens?: number
    latency?: number
    confidence?: number
    fallbackUsed?: boolean
    attemptCount?: number
  }
}

// === OpenAI Types ===
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIRequest {
  model: string
  messages: OpenAIMessage[]
  temperature?: number
  max_tokens?: number
  response_format?: { type: 'json_object' }
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  seed?: number
}

// === Error Types ===
export class CloudFunctionError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'CloudFunctionError'
  }
}

// === Validation Types ===
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// === Enhanced bet type configurations ===
interface BetTypeConfig {
  weight: number
  contextFactors: string[]
  conflictsWith?: string[]
  requiresPosition?: string[]
  bestGameScripts: string[]
}

export const ENHANCED_BET_TYPE_CONFIGS: Record<string, BetTypeConfig> = {
  // Team-based bets
  spread: {
    weight: 0.25,
    contextFactors: ['home_field', 'recent_form', 'injuries', 'weather'],
    conflictsWith: ['moneyline'], // Avoid redundant team outcome bets
    bestGameScripts: ['close_game', 'balanced_tempo'],
  },

  moneyline: {
    weight: 0.15,
    contextFactors: ['underdog_value', 'rivalry', 'motivation'],
    conflictsWith: ['spread'],
    bestGameScripts: ['blowout', 'close_game'],
  },

  team_total: {
    weight: 0.2,
    contextFactors: ['offensive_efficiency', 'pace', 'opponent_defense'],
    conflictsWith: ['total'], // Avoid double-dipping on scoring
    bestGameScripts: ['high_scoring', 'defensive'],
  },

  // Game-based bets
  total: {
    weight: 0.25,
    contextFactors: ['weather', 'pace', 'both_offenses', 'both_defenses'],
    conflictsWith: ['team_total'],
    bestGameScripts: ['high_scoring', 'defensive'],
  },

  first_half_total: {
    weight: 0.15,
    contextFactors: ['fast_starts', 'scripted_plays', 'coaching'],
    conflictsWith: ['total'],
    bestGameScripts: ['high_scoring', 'blowout'],
  },

  // Player-based bets (expanded)
  player_passing: {
    weight: 0.3,
    contextFactors: ['opponent_pass_defense', 'weather', 'game_script'],
    requiresPosition: ['QB'],
    bestGameScripts: ['high_scoring', 'close_game'],
  },

  player_rushing: {
    weight: 0.25,
    contextFactors: ['opponent_run_defense', 'game_script', 'workload'],
    requiresPosition: ['QB', 'RB'],
    bestGameScripts: ['defensive', 'blowout'],
  },

  player_receiving: {
    weight: 0.3,
    contextFactors: ['target_share', 'matchup', 'game_script'],
    requiresPosition: ['WR', 'TE', 'RB'],
    bestGameScripts: ['high_scoring', 'close_game'],
  },

  // Special/situational bets
  first_touchdown: {
    weight: 0.1,
    contextFactors: ['red_zone_usage', 'goal_line_carries'],
    requiresPosition: ['RB', 'WR', 'TE'],
    bestGameScripts: ['high_scoring', 'balanced_tempo'],
  },

  defensive_props: {
    weight: 0.1,
    contextFactors: ['opponent_turnovers', 'pass_rush'],
    bestGameScripts: ['defensive', 'blowout'],
  },

  kicking_props: {
    weight: 0.05,
    contextFactors: ['weather', 'red_zone_efficiency', 'dome_vs_outdoor'],
    requiresPosition: ['K'],
    bestGameScripts: ['defensive', 'close_game'],
  },
}

// === Template Detection Rules ===
export const TEMPLATE_DETECTION_RULES = {
  // Classic template: Team spread + QB rushing + Game total
  classicTemplate: {
    pattern: ['spread', 'player_rushing', 'total'],
    riskLevel: 'high' as const,
    warningThreshold: 0.7, // If 70% confidence this is a template
  },

  // Generic player props template
  genericPlayerProps: {
    pattern: ['player_passing', 'player_rushing', 'player_receiving'],
    riskLevel: 'medium' as const,
    warningThreshold: 0.6,
  },

  // Generic reasoning patterns
  genericReasoning: {
    phrases: [
      'home field advantage',
      'recent form suggests',
      'both teams have',
      'expect a competitive game',
      'value in this bet',
      'strong matchup',
      'favorable conditions',
    ],
    riskLevel: 'medium' as const,
    warningThreshold: 0.5,
  },
}

// === Context-aware bet type selection logic ===
export class EnhancedBetTypeSelector {
  /**
   * Select optimal bet types based on game context and variety factors
   */
  static selectBetTypes(
    gameContext: any,
    varietyFactors: VarietyFactors,
    availablePlayers: NFLPlayer[]
  ): string[] {
    const selectedTypes: string[] = []
    const availableTypes = Object.keys(ENHANCED_BET_TYPE_CONFIGS)

    // Filter types based on game script
    const gameScriptTypes = availableTypes.filter(type => {
      const config = ENHANCED_BET_TYPE_CONFIGS[type]
      return (
        !config.bestGameScripts ||
        config.bestGameScripts.includes(varietyFactors.gameScript)
      )
    })

    // Ensure variety by avoiding conflicts
    const typeWeights = this.calculateTypeWeights(gameContext, varietyFactors)

    // Select 3 different types with weighted randomness
    while (selectedTypes.length < 3 && gameScriptTypes.length > 0) {
      const selectedType = this.weightedRandomSelection(
        gameScriptTypes,
        typeWeights
      )

      if (!selectedTypes.includes(selectedType)) {
        selectedTypes.push(selectedType)

        // Remove conflicting types
        const config = ENHANCED_BET_TYPE_CONFIGS[selectedType]
        if (config.conflictsWith) {
          config.conflictsWith.forEach((conflictType: string) => {
            const index = gameScriptTypes.indexOf(conflictType)
            if (index > -1) gameScriptTypes.splice(index, 1)
          })
        }

        // Remove selected type from available options
        const index = gameScriptTypes.indexOf(selectedType)
        if (index > -1) gameScriptTypes.splice(index, 1)
      }
    }

    return selectedTypes
  }

  /**
   * Calculate dynamic weights based on context
   */
  private static calculateTypeWeights(
    gameContext: any,
    varietyFactors: VarietyFactors
  ): Record<string, number> {
    const weights: Record<string, number> = {}

    Object.entries(ENHANCED_BET_TYPE_CONFIGS).forEach(([type, config]) => {
      let weight = config.weight

      // Adjust weight based on context factors
      if (
        gameContext.weather?.condition === 'rain' &&
        type.includes('passing')
      ) {
        weight *= 0.7 // Reduce passing props in rain
      }

      if (
        gameContext.weather?.condition === 'rain' &&
        type.includes('rushing')
      ) {
        weight *= 1.3 // Increase rushing props in rain
      }

      if (
        varietyFactors.focusArea === 'offense' &&
        type.startsWith('player_')
      ) {
        weight *= 1.2 // Boost player props for offense focus
      }

      if (varietyFactors.riskTolerance > 0.7 && config.weight < 0.2) {
        weight *= 1.5 // Boost exotic bets for high risk tolerance
      }

      weights[type] = weight
    })

    return weights
  }

  /**
   * Weighted random selection of bet types
   */
  private static weightedRandomSelection(
    types: string[],
    weights: Record<string, number>
  ): string {
    const totalWeight = types.reduce(
      (sum, type) => sum + (weights[type] || 0.1),
      0
    )
    let random = Math.random() * totalWeight

    for (const type of types) {
      random -= weights[type] || 0.1
      if (random <= 0) return type
    }

    return types[0] // Fallback
  }
}
