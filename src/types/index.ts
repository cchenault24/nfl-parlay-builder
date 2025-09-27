// src/types/index.ts - Frontend type definitions
import * as Shared from '@npb/shared'
import { Timestamp } from 'firebase/firestore'

// ===== RE-EXPORT SHARED TYPES =====
export * from '@npb/shared'

// ===== FRONTEND-SPECIFIC EXTENSIONS =====

/**
 * UI bet types for consistent display
 */
export type BetType = 'spread' | 'total' | 'moneyline' | 'player_prop'

/**
 * Extended GeneratedParlay for UI with additional optional fields
 * The UI expects more fields — add them as OPTIONAL so we don't
 * force the server to provide them during the migration.
 */
export interface GeneratedParlay extends Shared.GeneratedParlay {
  id?: string
  gameContext?: string
  aiReasoning?: string
  overallConfidence?: number
  estimatedOdds?: string
  createdAt?: string
  savedAt?: Timestamp
  gameSummary?: Shared.GameSummary
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

export interface ParlayRequest {
  gameId: string
  legCount: 3
}

// ===== AUTH TYPES (app) =====

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

// ===== UI-SPECIFIC TYPES =====

/**
 * Strategy configuration options for UI
 */
export interface UIStrategyConfig extends Shared.StrategyConfig {
  // UI-specific fields can be added here
  displayOrder?: number
  category?: 'beginner' | 'advanced' | 'expert'
  icon?: string
  color?: string
}

/**
 * UI variety factors with display metadata
 */
export interface UIVarietyFactors extends Shared.VarietyFactors {
  // UI-specific fields
  displayName?: string
  tooltip?: string
}

/**
 * Parlay generation options for UI components
 */
export interface UIParlayOptions extends Shared.ParlayOptions {
  strategy?: UIStrategyConfig
  variety?: UIVarietyFactors
}

// ===== COMPONENT TYPES =====

/**
 * Props for strategy selection components
 */
export interface StrategySelectionProps {
  value?: Shared.StrategyConfig
  onChange: (strategy: Shared.StrategyConfig) => void
  disabled?: boolean
  showAdvanced?: boolean
}

/**
 * Props for variety factors components
 */
export interface VarietyFactorsProps {
  value?: Shared.VarietyFactors
  onChange: (factors: Shared.VarietyFactors) => void
  disabled?: boolean
}

/**
 * Props for parlay display components
 */
export interface ParlayDisplayProps {
  parlay: GeneratedParlay
  showDetails?: boolean
  onSave?: (parlay: GeneratedParlay) => void
  onShare?: (parlay: GeneratedParlay) => void
}

// ===== API RESPONSE TYPES =====

/**
 * Enhanced error response for UI handling
 */
export interface UIErrorResponse {
  code: string
  message: string
  userMessage?: string // User-friendly message for display
  retryable?: boolean
  details?: unknown
}

/**
 * Loading states for UI components
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

/**
 * Notification types for UI feedback
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

// ===== FORM TYPES =====

/**
 * Form validation state
 */
export interface ValidationState {
  isValid: boolean
  errors: Record<string, string>
  touched: Record<string, boolean>
}

/**
 * Strategy form values
 */
export interface StrategyFormValues {
  name: string
  description?: string
  temperature?: number
  riskLevel?: 'conservative' | 'medium' | 'aggressive'
  confidenceRange?: [number, number]
  focusArea?: 'spread' | 'totals' | 'player_props' | 'balanced'
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

// ===== STORE TYPES =====

/**
 * Global app state interface
 */
export interface AppState {
  user: UserProfile | null
  selectedGame: Shared.NFLGame | null
  currentParlay: GeneratedParlay | null
  strategy: Shared.StrategyConfig
  varietyFactors: Shared.VarietyFactors
  isLoading: boolean
  error: UIErrorResponse | null
  notifications: UINotification[]
}

/**
 * Parlay generation state
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

// ===== UTILITY TYPES =====

/**
 * Async operation result
 */
export type AsyncResult<T> = {
  data?: T
  error?: UIErrorResponse
  loading: boolean
}

/**
 * Optional fields helper
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Required fields helper
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
