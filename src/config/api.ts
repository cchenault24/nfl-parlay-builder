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
  FIREBASE_API_KEY: getEnvVar('VITE_FIREBASE_API_KEY'),
  FIREBASE_AUTH_DOMAIN: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  FIREBASE_PROJECT_ID: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  FIREBASE_STORAGE_BUCKET: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  FIREBASE_MESSAGING_SENDER_ID: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  FIREBASE_APP_ID: getEnvVar('VITE_FIREBASE_APP_ID'),
  NODE_ENV: getEnvVar('NODE_ENV') || 'development',
  CLOUD_FUNCTION_URL: getEnvVar('VITE_CLOUD_FUNCTION_URL'),
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
  CLOUD_FUNCTIONS: {
    baseURL:
      ENV.CLOUD_FUNCTION_URL ||
      (ENV.NODE_ENV === 'development'
        ? `http://localhost:5001/${ENV.FIREBASE_PROJECT_ID}/us-central1`
        : `https://us-central1-${ENV.FIREBASE_PROJECT_ID}.cloudfunctions.net`),
    timeout: ENV.NODE_ENV === 'development' ? 60000 : 45000,
    retryAttempts: 2,
    retryDelay: 2000,
    endpoints: {
      generateParlay: '/generateParlay',
      healthCheck: '/healthCheck',
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
  MOCK_APIS: getEnvVar('VITE_USE_MOCK_OPENAI') === 'true',

  // Rate limiting settings
  RATE_LIMITING: {
    enabled: ENV.NODE_ENV === 'production',
    requestsPerMinute: 60,
  },
  USE_CLOUD_FUNCTIONS: true,
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
