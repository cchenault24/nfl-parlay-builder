// =============================================================================
// APP TYPE DEFINITIONS - SINGLE SOURCE OF TRUTH
// =============================================================================
// src/types/index.ts
// This file consolidates all type definitions to eliminate duplication
// and establish clear ownership for each domain

import type { Timestamp } from 'firebase/firestore'

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
 * Loading states for UI components
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

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
 * Football position abbreviations (comprehensive list)
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
  savedAt?: Timestamp
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
// API & RESPONSE TYPES
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface APIResponse<T> {
  data: T
  status: number
  headers?: Record<string, string>
}

/**
 * API error response structure
 */
export interface APIErrorResponse {
  message?: string
  error?: string
  status?: number
  code?: string
  details?: Record<string, string | number | boolean>
}

/**
 * Enhanced error response for UI handling
 */
export interface UIErrorResponse {
  code: string
  message: string
  userMessage?: string
  retryable?: boolean
  details?: unknown
}

/**
 * Parlay generation API request
 */
export interface ParlayRequest {
  gameId: string
  legCount: 3
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

// =============================================================================
// USER & PERSISTENCE TYPES
// =============================================================================

/**
 * User profile information
 */
export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  createdAt: Timestamp
  savedParlays?: string[]
}

/**
 * Saved parlay with user context
 */
export interface SavedParlay extends GeneratedParlay {
  userId: string
  savedAt: Timestamp
}

// =============================================================================
// UI & COMPONENT TYPES
// =============================================================================

/**
 * UI notification structure
 */
export interface UINotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Global application state
 */
export interface AppState {
  user: UserProfile | null
  selectedGame: NFLGame | null
  currentParlay: GeneratedParlay | null
  strategy: StrategyConfig
  varietyFactors: VarietyFactors
  isLoading: boolean
  error: UIErrorResponse | null
  notifications: UINotification[]
}

/**
 * Parlay-specific state
 */
export interface ParlayState {
  isGenerating: boolean
  currentParlay: GeneratedParlay | null
  savedParlays: SavedParlay[]
  history: GeneratedParlay[]
  rateLimitInfo?: {
    remaining: number
    total: number
    resetTime: string
    currentCount: number
  }
}

/**
 * Form validation state
 */
export interface ValidationState {
  isValid: boolean
  errors: Record<string, string>
  touched: Record<string, boolean>
}

// =============================================================================
// COMPONENT PROP TYPES
// =============================================================================

/**
 * Strategy selection component props
 */
export interface StrategySelectionProps {
  value?: StrategyConfig
  onChange: (strategy: StrategyConfig) => void
  disabled?: boolean
  showAdvanced?: boolean
}

/**
 * Variety factors component props
 */
export interface VarietyFactorsProps {
  value?: VarietyFactors
  onChange: (factors: VarietyFactors) => void
  disabled?: boolean
}

/**
 * Parlay display component props
 */
export interface ParlayDisplayProps {
  parlay: GeneratedParlay
  showDetails?: boolean
  onSave?: (parlay: GeneratedParlay) => void
  onShare?: (parlay: GeneratedParlay) => void
}

// =============================================================================
// FORM TYPES
// =============================================================================

/**
 * Strategy form values
 */
export interface StrategyFormValues {
  name: string
  description?: string
  temperature?: number
  riskLevel?: RiskLevel
  confidenceRange?: [number, number]
  focusArea?: FocusArea
  maxLegs?: number
}

/**
 * Variety factors form values
 */
export interface VarietyFormValues {
  strategy?: string
  focusArea?: string
  playerTier?: string
  gameScript?: string
  marketBias?: string
  riskTolerance?: number
  focusPlayer?: string
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Async operation result wrapper
 */
export type AsyncResult<T> = {
  data?: T
  error?: UIErrorResponse
  loading: boolean
}

/**
 * Make specific fields optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Make specific fields required
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// =============================================================================
// ESPN API TYPES (External Integration)
// =============================================================================

/**
 * ESPN API team structure
 */
export interface ESPNTeam {
  id: string
  name: string
  displayName: string
  abbreviation: string
  color?: string
  alternateColor?: string
  logo: string
}

/**
 * ESPN API competitor structure
 */
export interface ESPNCompetitor {
  id: string
  homeAway: 'home' | 'away'
  team: ESPNTeam
}

/**
 * ESPN API competition structure
 */
export interface ESPNCompetition {
  id: string
  competitors: ESPNCompetitor[]
}

/**
 * ESPN API event structure
 */
export interface ESPNEvent {
  id: string
  date: string
  competitions: ESPNCompetition[]
  week?: { number: number }
  season?: { year: number }
  status?: { type: { name: string } }
}

/**
 * ESPN API scoreboard response
 */
export interface ESPNScoreboardResponse {
  events: ESPNEvent[]
  week?: { number: number }
  season?: { year: number }
}

/**
 * ESPN API athlete structure
 */
export interface ESPNAthlete {
  id: string
  displayName: string
  fullName?: string
  position?: { name: string; abbreviation: string }
  jersey?: string
  experience?: { years: number }
  college?: { name: string }
}

/**
 * ESPN API roster response
 */
export interface ESPNRosterResponse {
  athletes: Array<{
    position?: string
    items: ESPNAthlete[]
  }>
}

/**
 * ESPN API error response
 */
export interface ESPNErrorResponse {
  message?: string
  error?: string
  status?: number
}

/**
 * Generic ESPN request data types
 */
export type ESPNRequestData = Record<string, unknown> | FormData | string | null

/**
 * Generic ESPN response data types
 */
export type ESPNResponseData =
  | ESPNScoreboardResponse
  | ESPNRosterResponse
  | ESPNErrorResponse
  | unknown

// =============================================================================
// API CLIENT TYPES
// =============================================================================

/**
 * API client configuration
 */
export interface APIConfig {
  baseURL: string
  headers?: Record<string, string>
  timeoutMs?: number
  retries?: number
  retryDelayMs?: number
}

/**
 * API request configuration
 */
export interface APIRequestConfig {
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | undefined | null>
  timeoutMs?: number
  signal?: AbortSignal
}

/**
 * API request data types
 */
export type APIRequestData =
  | Record<string, unknown>
  | FormData
  | ArrayBuffer
  | Blob
  | string
  | Uint8Array
  | undefined

/**
 * HTTP error class for API responses
 */
export class HTTPError<T = unknown> extends Error {
  public readonly status: number
  public readonly body: T | undefined

  constructor(message: string, status: number, body?: T) {
    super(message)
    this.name = 'HTTPError'
    this.status = status
    this.body = body
  }
}

/**
 * Generic API client interface
 */
export interface IAPIClient {
  get<T>(endpoint: string, config?: APIRequestConfig): Promise<APIResponse<T>>
  post<T>(
    endpoint: string,
    data?: APIRequestData,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>
  put<T>(
    endpoint: string,
    data?: APIRequestData,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>
  patch<T>(
    endpoint: string,
    data?: APIRequestData,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>
  delete<T>(
    endpoint: string,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>
}

/**
 * NFL-specific client interface
 */
export interface INFLClient {
  getScoreboard(
    week?: number,
    year?: number
  ): Promise<APIResponse<ESPNScoreboardResponse>>
  getTeamRoster(teamId: string): Promise<APIResponse<ESPNRosterResponse>>
}

// =============================================================================
// EXPORT ALIASES FOR BACKWARD COMPATIBILITY
// =============================================================================

/**
 * Legacy aliases - use these during migration period only
 * @deprecated Use the main interfaces instead
 */
export type UIBetType = BetType
export type UIParlayOptions = ParlayOptions
export type UIStrategyConfig = StrategyConfig
export type UIVarietyFactors = VarietyFactors
