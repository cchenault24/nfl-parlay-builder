// =============================================================================
// FUNCTIONS TYPE DEFINITIONS
// =============================================================================
// functions/src/types/index.ts
// Subset of types needed by Firebase Functions

// =============================================================================
// CORE DOMAIN TYPES
// =============================================================================

/**
 * Supported bet types in the parlay system
 */
export type BetType = 'spread' | 'moneyline' | 'total' | 'player_prop'

/**
 * NFL game status states
 */
export type NFLGameStatus = 'scheduled' | 'in_progress' | 'final'

/**
 * Game flow types for analysis
 */
export type GameFlow =
  | 'high_scoring_shootout'
  | 'defensive_grind'
  | 'balanced_tempo'
  | 'potential_blowout'

/**
 * Risk levels for strategy configuration
 */
export type RiskLevel = 'conservative' | 'medium' | 'aggressive'

/**
 * Focus areas for betting strategy
 */
export type FocusArea = 'spread' | 'totals' | 'player_props' | 'balanced'

/**
 * Player status types
 */
export type PlayerStatus = 'active' | 'inactive' | 'injured' | 'out'

// =============================================================================
// NFL DOMAIN TYPES
// =============================================================================

/**
 * Football position abbreviations
 */
export type PositionAbbr =
  | 'QB'
  | 'RB'
  | 'WR'
  | 'TE'
  | 'FB'
  | 'OL'
  | 'LT'
  | 'LG'
  | 'C'
  | 'RG'
  | 'RT'
  | 'EDGE'
  | 'DL'
  | 'DE'
  | 'DT'
  | 'NT'
  | 'LB'
  | 'OLB'
  | 'MLB'
  | 'ILB'
  | 'CB'
  | 'S'
  | 'FS'
  | 'SS'
  | 'DB'
  | 'K'
  | 'P'
  | 'KR'
  | 'PR'
  | 'LS'

/**
 * Player position information
 */
export interface Position {
  abbreviation: PositionAbbr | string
  name?: string
  offense?: boolean
  defense?: boolean
  specialTeams?: boolean
}

/**
 * NFL team information
 */
export interface NFLTeam {
  id: string
  abbreviation: string
  displayName: string
  location: string
  name: string
  color: string
  alternateColor: string
  logo: string
}

/**
 * NFL player information
 */
export interface NFLPlayer {
  id: string
  fullName: string
  firstName?: string
  lastName?: string
  displayName?: string
  position?: Position | string
  jerseyNumber?: string
  jersey?: string
  teamId?: string
  status?: PlayerStatus
  age?: number
  experience?: number
  college?: string
}

/**
 * NFL game information
 */
export interface NFLGame {
  id: string
  week: number
  date: string // ISO datetime
  startTime: string // ISO datetime
  status: NFLGameStatus
  homeTeam: NFLTeam
  awayTeam: NFLTeam
  venue: string
}

/**
 * Game rosters for both teams
 */
export interface GameRosters {
  gameId: string
  home: NFLPlayer[]
  away: NFLPlayer[]
}

// =============================================================================
// GAME ANALYSIS DATA TYPES
// =============================================================================

/**
 * Flexible data types for game analysis that can come from AI in various formats
 */
export type MatchupAnalysisData =
  | string
  | Record<string, unknown>
  | null
  | undefined

export type PredictionData = string | Record<string, unknown> | null | undefined

export type KeyFactorsData =
  | string[]
  | string
  | Record<string, unknown>
  | null
  | undefined

/**
 * Game analysis and summary
 */
export interface GameSummary {
  gameFlow?: GameFlow
  matchupAnalysis?: MatchupAnalysisData
  prediction?: PredictionData
  keyFactors?: KeyFactorsData
  confidence?: number

  // Legacy support for older formats
  matchup?: string
  narrative?: string
  edges?: string[]
}

// =============================================================================
// BETTING & PARLAY TYPES
// =============================================================================

/**
 * Individual bet leg in a parlay
 */
export interface ParlayLeg {
  id: string
  betType: BetType
  selection: string
  target: string
  description?: string
  reasoning: string
  confidence: number
  odds: string | number
  threshold?: number
  price?: number
  rationale?: string
}

/**
 * Complete generated parlay
 */
export interface GeneratedParlay {
  gameId: string
  legs: ParlayLeg[]
  summary?: string

  // Optional UI-specific fields
  id?: string
  gameContext?: string
  aiReasoning?: string
  overallConfidence?: number
  estimatedOdds?: string
  createdAt?: string
  savedAt?: any // Functions don't need Firestore Timestamp type
  gameSummary?: GameSummary
  notes?: string
}

/**
 * Parlay generation options
 */
export interface ParlayOptions {
  gameId: string
  numLegs: number
  strategies?: string[]
  strategy?: StrategyConfig
  variety?: VarietyFactors
  riskTolerance?: number
  temperature?: number
  maxLegs?: number
  provider?: 'openai' | 'mock' | 'auto'
}

// =============================================================================
// STRATEGY & CONFIGURATION TYPES
// =============================================================================

/**
 * Strategy configuration for parlay generation
 */
export interface StrategyConfig {
  name: string
  description?: string
  temperature?: number
  riskLevel?: RiskLevel
  riskProfile?: RiskLevel
  confidenceRange?: [number, number]
  focusArea?: FocusArea
  maxLegs?: number
  displayOrder?: number
  category?: 'beginner' | 'advanced' | 'expert'
  icon?: string
  color?: string
}

/**
 * Variety factors for parlay generation
 */
export interface VarietyFactors {
  strategy?: string
  focusArea?: string
  playerTier?: string
  gameScript?: string
  marketBias?: string
  riskTolerance?: number
  focusPlayer?: string
  displayName?: string
  tooltip?: string
}

// =============================================================================
// DATA ORCHESTRATION TYPES
// =============================================================================

/**
 * Weather information for games
 */
export interface Weather {
  condition: 'clear' | 'rain' | 'snow' | 'wind' | 'indoor'
  temperature?: number
  windSpeed?: number
  humidity?: number
  description?: string
}

/**
 * Player injury information
 */
export interface PlayerInjury {
  playerId: string
  playerName: string
  position: string
  status: 'questionable' | 'doubtful' | 'out' | 'injured_reserve'
  injury: string
  expectedReturn?: string
}

/**
 * Injury report for a game
 */
export interface InjuryReport {
  gameId: string
  lastUpdated: string
  home: PlayerInjury[]
  away: PlayerInjury[]
}

/**
 * Betting market line
 */
export interface MarketLine {
  type: 'spread' | 'moneyline' | 'total'
  value: number
  odds: number
  bookmaker?: string
  lastUpdated: string
}

/**
 * Team or player performance trend
 */
export interface Trend {
  id: string
  type: 'team' | 'player'
  category: 'offensive' | 'defensive' | 'special_teams'
  description: string
  stat: string
  value: number
  games: number
  direction: 'up' | 'down' | 'stable'
}

/**
 * Unified game data from multiple sources
 */
export interface UnifiedGameData {
  game: NFLGame
  rosters: GameRosters
  weather?: Weather
  injuries?: InjuryReport
  trends: Trend[]
  lines: MarketLine[]
}

// =============================================================================
// API & RESPONSE TYPES
// =============================================================================

/**
 * Parlay generation API request
 */
export interface ParlayRequest {
  gameId: string
  legCount: 3
  options?: ParlayOptions
}

/**
 * Enhanced parlay generation request with full options
 */
export interface GenerateParlayRequest {
  gameId: string
  options?: ParlayOptions
}

/**
 * Parlay generation API response
 */
export interface GenerateParlayResponse {
  success: boolean
  parlay?: GeneratedParlay
  data?: GeneratedParlay
  error?: string | { code?: string; message: string; details?: unknown }
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

/**
 * Parlay generation result with rate limiting info
 */
export interface ParlayGenerationResult {
  parlay: GeneratedParlay
  rateLimitInfo?: {
    remaining: number
    total: number
    resetTime: string
    currentCount: number
  }
}
