// =============================================================================
// APP CONSTANTS - SINGLE SOURCE OF TRUTH
// =============================================================================

// This file consolidates all constants to eliminate duplication
// and establish clear ownership for each domain

import type { ParlayOptions, StrategyConfig, VarietyFactors } from '../types'

// =============================================================================
// ENVIRONMENT & CONFIGURATION
// =============================================================================

/**
 * Environment detection helpers
 */
export const ENVIRONMENT = {
  get NODE_ENV() {
    return import.meta?.env?.NODE_ENV || process.env.NODE_ENV || 'development'
  },
  get isDevelopment() {
    return this.NODE_ENV === 'development'
  },
  get isProduction() {
    return this.NODE_ENV === 'production'
  },
  get isTest() {
    return this.NODE_ENV === 'test'
  },
  get isLocalDevelopment() {
    // Check if we're running locally
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const isLocal =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.includes('192.168.')

      // FORCE PRODUCTION: If we're on Firebase hosting domains, never use localhost
      const isFirebaseHosting =
        hostname.includes('.web.app') || hostname.includes('.firebaseapp.com')
      if (isFirebaseHosting) {
        console.log('🔧 Firebase hosting detected, forcing production URLs')
        return false
      }

      return isLocal
    }
    return this.isDevelopment
  },
} as const

/**
 * Environment variable helpers with validation
 */
const getEnvVar = (key: string, fallback?: string): string => {
  const value = import.meta?.env?.[key] || process.env[key] || fallback
  return value || ''
}

/**
 * Environment variables with validation
 */
export const ENV = {
  // Firebase Configuration
  FIREBASE_API_KEY: getEnvVar('VITE_FIREBASE_API_KEY'),
  FIREBASE_AUTH_DOMAIN: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  FIREBASE_PROJECT_ID: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  FIREBASE_STORAGE_BUCKET: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  FIREBASE_MESSAGING_SENDER_ID: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  FIREBASE_APP_ID: getEnvVar('VITE_FIREBASE_APP_ID'),

  // API Configuration
  CLOUD_FUNCTION_URL: getEnvVar('VITE_CLOUD_FUNCTION_URL'),
  ESPN_BASE_URL: getEnvVar('VITE_ESPN_BASE_URL'),

  // OpenAI Configuration
  OPENAI_API_KEY: getEnvVar('OPENAI_API_KEY'),

  // Mock Configuration
  MOCK_ERROR_RATE: parseFloat(getEnvVar('VITE_MOCK_ERROR_RATE', '0.05')),
  MOCK_DELAY_MIN: parseInt(getEnvVar('VITE_MOCK_DELAY_MIN', '1000'), 10),
  MOCK_DELAY_MAX: parseInt(getEnvVar('VITE_MOCK_DELAY_MAX', '2500'), 10),

  // Rate Limiting
  RATE_LIMIT_ENABLED: getEnvVar('VITE_RATE_LIMIT_ENABLED', 'true') === 'true',
  RATE_LIMIT_MAX_REQUESTS: parseInt(
    getEnvVar('VITE_RATE_LIMIT_MAX_REQUESTS', '10'),
    10
  ),
  RATE_LIMIT_WINDOW_MINUTES: parseInt(
    getEnvVar('VITE_RATE_LIMIT_WINDOW_MINUTES', '60'),
    10
  ),

  // Cleanup
  CLEANUP_TOKEN: getEnvVar('CLEANUP_TOKEN'),
} as const

/**
 * Validate required environment variables
 */
export const validateEnvironment = (): void => {
  const requiredVars = {
    FIREBASE_PROJECT_ID: ENV.FIREBASE_PROJECT_ID,
  }

  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }
}

// =============================================================================
// API CONFIGURATION
// =============================================================================

/**
 * ESPN API Configuration
 */
export const ESPN_CONFIG = {
  baseURL:
    ENV.ESPN_BASE_URL ||
    'https://site.api.espn.com/apis/site/v2/sports/football/nfl',
  timeout: ENVIRONMENT.isLocalDevelopment ? 15000 : 10000,
  retryAttempts: ENVIRONMENT.isLocalDevelopment ? 2 : 3,
  retryDelay: 1000,
  userAgent: 'nfl-parlay-builder',
  endpoints: {
    scoreboard: '/scoreboard',
    games: '/scoreboard',
    roster: '/teams/{teamId}/roster',
  },
  headers: {
    Accept: 'application/json',
  },
} as const

/**
 * Cloud Functions Configuration
 */
export const CLOUD_FUNCTIONS_CONFIG = {
  get baseURL() {
    return (
      ENV.CLOUD_FUNCTION_URL ||
      (ENVIRONMENT.isLocalDevelopment
        ? `http://localhost:5001/${ENV.FIREBASE_PROJECT_ID}/us-central1`
        : `https://us-central1-${ENV.FIREBASE_PROJECT_ID}.cloudfunctions.net`)
    )
  },
  timeout: ENVIRONMENT.isLocalDevelopment ? 60000 : 45000,
  retryAttempts: 2,
  retryDelay: 2000,
  endpoints: {
    generateParlay: '/generateParlay',
    healthCheck: '/healthCheck',
    getRateLimitStatus: '/getRateLimitStatus',
  },
} as const

/**
 * OpenAI Configuration
 */
export const OPENAI_CONFIG = {
  model: 'gpt-4o-mini',
  defaultTemperature: 0.7,
  defaultMaxTokens: 4000,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const

// =============================================================================
// PARLAY & BETTING CONSTANTS
// =============================================================================

/**
 * Default betting strategies
 */
export const DEFAULT_STRATEGIES: readonly string[] = [
  'High Confidence (safer, lower payout)',
  'Balanced (mix of spread/props/totals)',
  'High Risk, High Reward',
] as const

/**
 * Default variety factors for parlay generation
 */
export const DEFAULT_VARIETY_FACTORS: VarietyFactors = {
  strategy: 'balanced',
  focusArea: 'matchup_based',
  playerTier: 'all_players',
  gameScript: 'competitive',
  marketBias: 'neutral',
  riskTolerance: 5,
} as const

/**
 * Default strategy configuration
 */
export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  name: 'Balanced',
  description: 'Mix of spread, props, and totals with moderate risk',
  riskLevel: 'medium',
  temperature: 0.7,
  focusArea: 'balanced',
  maxLegs: 3,
} as const

/**
 * Default parlay options
 */
export const DEFAULT_PARLAY_OPTIONS: ParlayOptions = {
  gameId: '',
  numLegs: 3,
  strategies: [...DEFAULT_STRATEGIES],
  strategy: DEFAULT_STRATEGY_CONFIG,
  variety: DEFAULT_VARIETY_FACTORS,
  temperature: 0.7,
  provider: 'auto',
} as const

/**
 * Betting constants
 */
export const BETTING = {
  MIN_LEGS: 2,
  MAX_LEGS: 10,
  DEFAULT_LEGS: 3,
  MIN_ODDS: -1000,
  MAX_ODDS: 1000,
  DEFAULT_ODDS: -110,
  MIN_CONFIDENCE: 1,
  MAX_CONFIDENCE: 10,
  DEFAULT_CONFIDENCE: 7,
} as const

/**
 * Risk levels and their configurations
 */
export const RISK_LEVELS = {
  conservative: {
    label: 'Conservative',
    description: 'Lower risk, higher probability bets',
    temperature: 0.3,
    confidenceRange: [8, 10] as [number, number],
    maxLegs: 3,
  },
  medium: {
    label: 'Medium',
    description: 'Balanced risk and reward',
    temperature: 0.7,
    confidenceRange: [6, 8] as [number, number],
    maxLegs: 4,
  },
  aggressive: {
    label: 'Aggressive',
    description: 'Higher risk, higher potential payout',
    temperature: 0.9,
    confidenceRange: [4, 7] as [number, number],
    maxLegs: 6,
  },
} as const

/**
 * Focus areas for betting strategy
 */
export const FOCUS_AREAS = {
  spread: {
    label: 'Point Spreads',
    description: 'Focus on team spread bets',
  },
  totals: {
    label: 'Over/Under',
    description: 'Focus on game totals',
  },
  player_props: {
    label: 'Player Props',
    description: 'Focus on individual player performance',
  },
  balanced: {
    label: 'Balanced',
    description: 'Mix of all bet types',
  },
} as const

// =============================================================================
// UI CONSTANTS
// =============================================================================

/**
 * Loading and timing constants
 */
export const UI = {
  LOADING_TIMEOUT: 30000,
  NOTIFICATION_DURATION: 5000,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  POLLING_INTERVAL: 5000,
} as const

/**
 * Pagination constants
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  INFINITE_SCROLL_THRESHOLD: 200,
} as const

/**
 * Validation constants
 */
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MAX_USERNAME_LENGTH: 50,
  MAX_DISPLAY_NAME_LENGTH: 100,
  MAX_BIO_LENGTH: 500,
} as const

/**
 * Storage keys for local storage
 */
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'nfl-parlay-user-preferences',
  LAST_STRATEGY: 'nfl-parlay-last-strategy',
  SAVED_PARLAYS: 'nfl-parlay-saved-parlays',
  RECENT_GAMES: 'nfl-parlay-recent-games',
  THEME: 'nfl-parlay-theme',
} as const

// =============================================================================
// FEATURE FLAGS
// =============================================================================

/**
 * Feature flags and configuration
 */
export const FEATURES = {
  // Development features
  DETAILED_LOGGING: ENVIRONMENT.isLocalDevelopment,
  API_LOGGING: ENVIRONMENT.isLocalDevelopment,
  MOCK_DATA: ENVIRONMENT.isLocalDevelopment,

  // Rate limiting
  RATE_LIMITING: {
    enabled: !ENVIRONMENT.isLocalDevelopment,
    requestsPerMinute: ENV.RATE_LIMIT_MAX_REQUESTS,
    windowMinutes: ENV.RATE_LIMIT_WINDOW_MINUTES,
  },

  // Cloud functions
  USE_CLOUD_FUNCTIONS: true,

  // AI features
  AI_FALLBACK: true,
  AI_RETRY_ENABLED: true,

  // UI features
  DARK_MODE: true,
  NOTIFICATIONS: true,
  ANALYTICS: ENVIRONMENT.isProduction,

  // Beta features
  ADVANCED_ANALYTICS: false,
  SOCIAL_SHARING: true,
  REAL_TIME_ODDS: false,
} as const

// =============================================================================
// LOGGING CONFIGURATION
// =============================================================================

/**
 * Logging levels and configuration
 */
export const LOGGING = {
  level: ENVIRONMENT.isLocalDevelopment ? 'debug' : 'info',
  enableConsole: true,
  enableRemote: ENVIRONMENT.isProduction,
  maxLogSize: 1000,
  retentionDays: 7,
} as const

/**
 * Log levels enum
 */
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const

// =============================================================================
// SPORTS DATA CONSTANTS
// =============================================================================

/**
 * NFL season and week constants
 */
export const NFL = {
  REGULAR_SEASON_WEEKS: 18,
  PLAYOFF_WEEKS: 4,
  TOTAL_WEEKS: 22,
  TEAMS_COUNT: 32,
  GAMES_PER_WEEK: 16,
  SEASON_START_MONTH: 9, // September
  SEASON_END_MONTH: 2, // February
} as const

/**
 * Position groups and categories
 */
export const POSITION_GROUPS = {
  OFFENSE: ['QB', 'RB', 'WR', 'TE', 'FB', 'OL', 'LT', 'LG', 'C', 'RG', 'RT'],
  DEFENSE: [
    'EDGE',
    'DL',
    'DE',
    'DT',
    'NT',
    'LB',
    'OLB',
    'MLB',
    'ILB',
    'CB',
    'S',
    'FS',
    'SS',
    'DB',
  ],
  SPECIAL_TEAMS: ['K', 'P', 'KR', 'PR', 'LS'],
} as const

/**
 * Game status constants
 */
export const GAME_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  FINAL: 'final',
} as const

// =============================================================================
// ERROR CODES & MESSAGES
// =============================================================================

/**
 * Error codes for consistent error handling
 */
export const ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',

  // API errors
  API_ERROR: 'API_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Business logic errors
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  GENERATION_FAILED: 'GENERATION_FAILED',

  // System errors
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

/**
 * User-friendly error messages
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK_ERROR]:
    'Network connection error. Please check your internet connection.',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]:
    'Too many requests. Please wait a moment and try again.',
  [ERROR_CODES.UNAUTHORIZED]: 'Authentication required. Please sign in.',
  [ERROR_CODES.FORBIDDEN]:
    'Access denied. You do not have permission to perform this action.',
  [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ERROR_CODES.INSUFFICIENT_DATA]:
    'Not enough data available to generate parlay.',
  [ERROR_CODES.GENERATION_FAILED]:
    'Failed to generate parlay. Please try again.',
  [ERROR_CODES.CONFIGURATION_ERROR]:
    'System configuration error. Please contact support.',
  [ERROR_CODES.UNKNOWN_ERROR]:
    'An unexpected error occurred. Please try again.',
} as const

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize environment validation in non-test environments
if (!ENVIRONMENT.isTest) {
  try {
    validateEnvironment()
  } catch (error) {
    console.error('Environment validation failed:', error)
    if (ENVIRONMENT.isProduction) {
      throw error
    }
  }
}

// =============================================================================
// EXPORTS FOR BACKWARD COMPATIBILITY
// =============================================================================

/**
 * Legacy exports - use these during migration period only
 * @deprecated Use the main constants instead
 */
export const API_CONFIG = {
  ESPN: ESPN_CONFIG,
  CLOUD_FUNCTIONS: CLOUD_FUNCTIONS_CONFIG,
} as const

export const DEFAULT_ESPN_BASE_URL = ESPN_CONFIG.baseURL
