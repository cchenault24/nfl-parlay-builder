import { getEnvVar } from '../utils'

export const ENV = {
  FIREBASE_PROJECT_ID: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  NODE_ENV: getEnvVar('NODE_ENV') || 'development',
} as const

const isLocalDevelopment = () => {
  if (typeof window === 'undefined') {
    return ENV.NODE_ENV === 'development'
  }
  const { hostname } = window.location
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.')
  )
}

// Only used locally, where requests go straight to the Functions emulator.
// Everywhere deployed (prod or a PR preview channel) `/api/**` is rewritten
// same-origin to the function by firebase.json, so no project id or
// cross-origin host needs to be known here at all.
function localFunctionsBaseUrl(): string {
  const projectId = ENV.FIREBASE_PROJECT_ID.trim() || 'nfl-parlay-builder-dev'
  return `http://localhost:5001/${projectId}/us-central1/api`
}

export const API_CONFIG = {
  CLOUD_FUNCTIONS: {
    baseURL: isLocalDevelopment() ? localFunctionsBaseUrl() : '/api',
  },
} as const
