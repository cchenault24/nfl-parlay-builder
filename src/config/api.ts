/**
 * API Configuration and Environment Variable Management
 */

// Workaround for TypeScript env issue (keeping your existing pattern)
const getEnvVar = (name: string): string => {
  return (import.meta as any).env[name] || ''
}

/**
 * Environment variables with validation
 */
export const ENV = {
  OPENAI_API_KEY: getEnvVar('VITE_OPENAI_API_KEY'),
  FIREBASE_API_KEY: getEnvVar('VITE_FIREBASE_API_KEY'),
  NODE_ENV: getEnvVar('NODE_ENV') || 'development',
} as const

/**
 * Validate required environment variables
 */
export const validateEnvironment = (): void => {
  const requiredVars = {
    OPENAI_API_KEY: ENV.OPENAI_API_KEY,
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

/**
 * API Configuration with environment-based settings
 */
export const API_CONFIG = {
  ESPN: {
    baseURL: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl',
    timeout: ENV.NODE_ENV === 'development' ? 15000 : 10000,
    retryAttempts: ENV.NODE_ENV === 'development' ? 2 : 3,
    retryDelay: 1000,
    endpoints: {
      scoreboard: '/scoreboard',
      games: '/scoreboard',
      roster: '/teams/{teamId}/roster',
    },
  },
  OPENAI: {
    baseURL: 'https://api.openai.com/v1',
    timeout: ENV.NODE_ENV === 'development' ? 45000 : 30000,
    retryAttempts: 2,
    retryDelay: 2000,
    models: {
      default: 'gpt-4o-mini',
      fallback: 'gpt-3.5-turbo',
    },
    endpoints: {
      chat: '/chat/completions',
    },
  },
} as const

/**
 * Feature flags and configuration
 */
export const FEATURES = {
  // Enable detailed logging in development
  DETAILED_LOGGING: ENV.NODE_ENV === 'development',

  // Enable request/response logging
  API_LOGGING: ENV.NODE_ENV === 'development',

  // Mock APIs for testing (could be controlled by env var)
  MOCK_APIS: false,

  // Rate limiting settings
  RATE_LIMITING: {
    enabled: ENV.NODE_ENV === 'production',
    requestsPerMinute: 60,
  },
} as const

/**
 * Logging configuration
 */
export const LOGGING = {
  level: ENV.NODE_ENV === 'development' ? 'debug' : 'info',
  enableConsole: true,
  enableRemote: ENV.NODE_ENV === 'production',
} as const

// Initialize environment validation in non-test environments
if (ENV.NODE_ENV !== 'test') {
  validateEnvironment()
}
