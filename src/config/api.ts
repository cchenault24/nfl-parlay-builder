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
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.includes('192.168.')

    const isFirebaseHosting =
      hostname.includes('.web.app') || hostname.includes('.firebaseapp.com')
    if (isFirebaseHosting) {
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
  CLOUD_FUNCTIONS: {
    baseURL: (() => {
      const projectId = ENV.FIREBASE_PROJECT_ID
      const resolvedProjectId = projectId || 'nfl-parlay-builder-dev'

      if (isLocalDevelopment()) {
        return `http://localhost:5001/${resolvedProjectId}/us-central1`
      }

      return `https://us-central1-${resolvedProjectId}.cloudfunctions.net`
    })(),
    timeout: isLocalDevelopment() ? 60000 : 45000,
    retryAttempts: 2,
    retryDelay: 2000,
    endpoints: {
      health: '/api/health',
      currentWeek: '/api/weeks/current',
      games: (week: number) => `/api/games?week=${week}`,
      generateParlay: '/api/parlays/generate',
      pfrSchedule: '/api/pfr-schedule',
      pfrGames: '/api/pfr-games',
    },
  },
} as const

if (ENV.NODE_ENV !== 'test') {
  validateEnvironment()
}
