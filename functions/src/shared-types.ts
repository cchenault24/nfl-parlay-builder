// functions/src/shared-types.ts - Direct copy of shared types for Cloud Build
// This avoids the workspace dependency issue during Firebase deployment

// ===== CORE STRATEGY TYPES =====
export interface StrategyConfig {
  name: string
  description?: string
  temperature?: number
  riskLevel?: 'conservative' | 'medium' | 'aggressive'
  riskProfile?: 'low' | 'medium' | 'high'
  confidenceRange?: [number, number]
  focusArea?: 'spread' | 'totals' | 'player_props' | 'balanced'
  maxLegs?: number
}

export interface VarietyFactors {
  strategy?: string
  focusArea?: string
  playerTier?: string
  gameScript?: string
  marketBias?: string
  riskTolerance?: number
  focusPlayer?: string
}

// ===== PARLAY TYPES =====

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

export interface ParlayLeg {
  id: string
  betType: 'spread' | 'total' | 'moneyline' | 'player_prop'
  selection: string
  target: string
  reasoning: string
  confidence: number
  odds: string
}

export interface ParlayOptions {
  strategy?: StrategyConfig
  variety?: VarietyFactors
  riskTolerance?: number
  temperature?: number
  maxLegs?: number
  provider?: 'openai' | 'mock' | 'auto'
}

export interface GeneratedParlay {
  gameId: string
  legs: Array<{
    type: 'spread' | 'total' | 'moneyline' | 'player_prop'
    selection: string
    threshold?: number
    price?: number
    rationale?: string
  }>
  notes?: string
  id?: string
  gameContext?: string
  aiReasoning?: string
  overallConfidence?: number
  estimatedOdds?: string
  gameSummary?: GameSummary
  createdAt?: string
  savedAt?: any
}

export interface GenerateParlayRequest {
  gameId: string
  options?: ParlayOptions
}

export interface GenerateParlayResponse {
  success: boolean
  data?: GeneratedParlay
  error?: { code?: string; message: string; details?: unknown }
  metadata?: {
    provider: string
    model: string
    tokens?: number
    latency: number
    confidence: number
    fallbackUsed: boolean
    attemptCount: number
    requestedProvider?: string
    actualProvider?: string
    providerMatch?: boolean
  }
}

export interface ParlayGenerationResult {
  parlay: GeneratedParlay
  rateLimitInfo?: {
    remaining: number
    total: number
    resetTime: string
    currentCount: number
  }
}

export interface SavedParlay extends GeneratedParlay {
  userId: string
  savedAt: any
}

// ===== NFL TYPES =====

export interface NFLTeam {
  id: string
  displayName: string
  abbreviation: string
  location: string
  name: string
  color: string
  alternateColor: string
  logo: string
}

export interface Position {
  id: string
  name: string
  abbreviation: string
  displayName: string
  leaf: boolean
}

export interface NFLPlayer {
  id: string
  displayName: string
  fullName: string
  jersey: string
  position: Position
  age?: number
  experience?: number
  college?: string
}

export interface NFLGame {
  id: string
  week: number
  awayTeam: NFLTeam
  homeTeam: NFLTeam
  startTime: string
  status: string
  date: string
  venue?: string
}

export interface GameRosters {
  gameId: string
  home: NFLPlayer[]
  away: NFLPlayer[]
  homeRoster?: NFLPlayer[]
  awayRoster?: NFLPlayer[]
}

// ===== DATA ORCHESTRATION TYPES =====

export interface Weather {
  condition: 'indoor' | 'clear' | 'rain' | 'snow' | 'wind'
  temperature?: number
  windSpeed?: number
  humidity?: number
}

export interface InjuryReport {
  playerId: string
  playerName: string
  position: string
  team: string
  injuryType: string
  status: 'out' | 'doubtful' | 'questionable' | 'probable'
  bodyPart: string
  expectedReturn?: string
}

export interface Trend {
  id: string
  type: 'team' | 'player' | 'matchup'
  description: string
  value: number
  confidence: number
  timeframe: string
}

export interface MarketLine {
  id: string
  type: 'spread' | 'total' | 'moneyline' | 'player_prop'
  value: number
  odds: number
  sportsbook: string
  lastUpdated: string
}

export interface UnifiedGameData {
  game: NFLGame
  rosters: GameRosters
  weather?: Weather
  injuries?: InjuryReport
  trends: Trend[]
  lines: MarketLine[]
}

// ===== DEFAULT CONFIGURATIONS =====

export const DEFAULT_STRATEGIES: Record<string, StrategyConfig> = {
  balanced: {
    name: 'Balanced Analysis',
    description: 'Well-rounded approach balancing risk and reward',
    temperature: 0.7,
    riskLevel: 'medium',
    confidenceRange: [5, 8],
    focusArea: 'balanced',
    maxLegs: 3,
  },
  conservative: {
    name: 'Conservative Picks',
    description: 'Lower risk bets with higher confidence',
    temperature: 0.5,
    riskLevel: 'conservative',
    confidenceRange: [7, 9],
    focusArea: 'spread',
    maxLegs: 3,
  },
  aggressive: {
    name: 'High Upside',
    description: 'Higher risk bets for maximum payout',
    temperature: 0.9,
    riskLevel: 'aggressive',
    confidenceRange: [4, 7],
    focusArea: 'player_props',
    maxLegs: 4,
  },
  player_focused: {
    name: 'Player Props Focus',
    description: 'Emphasis on individual player performance',
    temperature: 0.8,
    riskLevel: 'medium',
    confidenceRange: [5, 8],
    focusArea: 'player_props',
    maxLegs: 3,
  },
}

export const DEFAULT_VARIETY_FACTORS: VarietyFactors = {
  strategy: 'balanced',
  focusArea: 'matchup_based',
  playerTier: 'all_players',
  gameScript: 'competitive',
  marketBias: 'neutral',
  riskTolerance: 5,
}

// ===== ERROR TYPES =====

export interface CloudFunctionError {
  code: string
  message: string
  details?: unknown
}
