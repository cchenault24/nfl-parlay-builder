// src/shared/types.ts

import type { Timestamp } from 'firebase/firestore'

/**
 * The available bet types we support in the parlay builder.
 * Include both hyphen and underscore variants to avoid breakage during migration.
 */
export type BetType =
  | 'spread'
  | 'moneyline'
  | 'total'
  | 'player_prop'
  | 'player_prop'

/**
 * A single leg in a parlay bet.
 */
export interface ParlayLeg {
  id: string
  betType: 'spread' | 'total' | 'moneyline' | 'player_prop'
  selection: string
  target: string
  reasoning: string
  confidence: number
  odds: string
}

/**
 * Options provided when requesting parlay generation.
 */
export interface ParlayOptions {
  gameId: string
  numLegs: number
  strategies?: string[]
}

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

export interface GameSummary {
  gameFlow: GameFlow
  matchupAnalysis: MatchupAnalysisData
  prediction: PredictionData
  keyFactors: string[] | string | Record<string, unknown> | null | undefined
  confidence: number
}

export type GameFlow =
  | 'high_scoring_shootout'
  | 'defensive_grind'
  | 'balanced_tempo'
  | 'potential_blowout'

/**
 * The fully generated parlay result returned by AI.
 * Frontend version includes UI-friendly optional fields.
 */
export interface GeneratedParlay {
  gameId: string
  legs: ParlayLeg[]
  summary?: string // compact explanation / AI reasoning

  // UI-extended, all optional
  id?: string
  gameContext?: string
  aiReasoning?: string
  overallConfidence?: number
  estimatedOdds?: string
  createdAt?: string
  savedAt?: Timestamp
  gameSummary?: GameSummary
}

/**
 * API response shape for the generateParlay function.
 */
export interface GenerateParlayResponse {
  success: boolean
  parlay?: GeneratedParlay
  error?: string
}

/**
 * NFL domain types that may be needed by the frontend.
 */
export type NFLGameStatus = 'scheduled' | 'in_progress' | 'final'

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

export interface NFLPlayer {
  id: string
  fullName: string
  firstName?: string
  lastName?: string
  position?: string
  jerseyNumber?: string
  teamId?: string
  status?: 'active' | 'inactive' | 'injured' | 'out'
}

export interface GameRosters {
  gameId: string
  home: NFLPlayer[]
  away: NFLPlayer[]
}

/**
 * Strategy and variety configuration (UI-facing shapes)
 */
export interface StrategyConfig {
  name: string
  description?: string
  temperature?: number
  riskLevel?: 'conservative' | 'medium' | 'aggressive'
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

// ===== UI-SPECIFIC TYPES =====

/** UI bet types for consistent display (alias kept for compatibility) */
export type UIBetType = BetType

/** Parlay generation options for UI components */
export interface UIParlayOptions extends ParlayOptions {
  strategy?: UIStrategyConfig
  variety?: UIVarietyFactors
}

/** Strategy configuration options for UI */
export interface UIStrategyConfig extends StrategyConfig {
  displayOrder?: number
  category?: 'beginner' | 'advanced' | 'expert'
  icon?: string
  color?: string
}

/** UI variety factors with display metadata */
export interface UIVarietyFactors extends VarietyFactors {
  displayName?: string
  tooltip?: string
}

// ===== COMPONENT TYPES =====

export interface StrategySelectionProps {
  value?: StrategyConfig
  onChange: (strategy: StrategyConfig) => void
  disabled?: boolean
  showAdvanced?: boolean
}

export interface VarietyFactorsProps {
  value?: VarietyFactors
  onChange: (factors: VarietyFactors) => void
  disabled?: boolean
}

export interface ParlayDisplayProps {
  parlay: GeneratedParlay
  showDetails?: boolean
  onSave?: (parlay: GeneratedParlay) => void
  onShare?: (parlay: GeneratedParlay) => void
}

// ===== API & STORE TYPES =====

export interface ParlayGenerationResult {
  parlay: GeneratedParlay
  rateLimitInfo?: {
    remaining: number
    total: number
    resetTime: string
    currentCount: number
  }
}

export interface ParlayRequest {
  gameId: string
  legCount: 3
}

export interface UIErrorResponse {
  code: string
  message: string
  userMessage?: string
  retryable?: boolean
  details?: unknown
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

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

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  createdAt: Timestamp
  savedParlays?: string[]
}

export interface SavedParlay extends GeneratedParlay {
  userId: string
  savedAt: Timestamp
}

// ===== FORM & UTIL TYPES =====

export interface ValidationState {
  isValid: boolean
  errors: Record<string, string>
  touched: Record<string, boolean>
}

export interface StrategyFormValues {
  name: string
  description?: string
  temperature?: number
  riskLevel?: 'conservative' | 'medium' | 'aggressive'
  confidenceRange?: [number, number]
  focusArea?: 'spread' | 'totals' | 'player_props' | 'balanced'
  maxLegs?: number
}

export interface VarietyFormValues {
  strategy?: string
  focusArea?: string
  playerTier?: string
  gameScript?: string
  marketBias?: string
  riskTolerance?: number
  focusPlayer?: string
}

export type AsyncResult<T> = {
  data?: T
  error?: UIErrorResponse
  loading: boolean
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
