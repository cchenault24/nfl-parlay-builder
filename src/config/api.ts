import { getEnvVar } from '../utils'

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
 * Determine if we're in a local development environment
 */
const isLocalDevelopment = () => {
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
      if (import.meta.env.DEV) {
        console.log('🔧 Firebase hosting detected, forcing production URLs')
      }
      return false
    }

    return isLocal
  }
  return ENV.NODE_ENV === 'development'
}

/**
 * API Configuration with environment-based settings
 */
export const API_CONFIG = {
  ESPN: {
    baseURL: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl',
    timeout: isLocalDevelopment() ? 15000 : 10000,
    retryAttempts: isLocalDevelopment() ? 2 : 3,
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
      (isLocalDevelopment()
        ? `http://localhost:5001/${ENV.FIREBASE_PROJECT_ID}/us-central1`
        : `https://us-central1-${ENV.FIREBASE_PROJECT_ID}.cloudfunctions.net`),
    timeout: isLocalDevelopment() ? 60000 : 45000,
    retryAttempts: 2,
    retryDelay: 2000,
    endpoints: {
      generateParlay: '/generateParlay',
      healthCheck: '/healthCheck',
      getRateLimitStatus: '/getRateLimitStatus',
    },
  },
} as const

/**
 * Feature flags and configuration
 */
export const FEATURES = {
  // Enable detailed logging in development
  DETAILED_LOGGING: isLocalDevelopment(),

  // Enable request/response logging
  API_LOGGING: isLocalDevelopment(),

  // Rate limiting settings
  RATE_LIMITING: {
    enabled: !isLocalDevelopment(),
    requestsPerMinute: 60,
  },
  USE_CLOUD_FUNCTIONS: true,
} as const

/**
 * Logging configuration
 */
export const LOGGING = {
  level: isLocalDevelopment() ? 'debug' : 'info',
  enableConsole: true,
  enableRemote: !isLocalDevelopment(),
} as const

// Initialize environment validation in non-test environments
if (ENV.NODE_ENV !== 'test') {
  validateEnvironment()
}
