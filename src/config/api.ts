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

// On Firebase Hosting (including preview channels) the project id is in the host.
const resolveProjectId = () => {
  if (ENV.FIREBASE_PROJECT_ID.trim()) {
    return ENV.FIREBASE_PROJECT_ID
  }
  const match = window.location.host.match(
    /^(?<projectId>[a-z0-9-]+?)(?:--[a-z0-9-]+)?\.(?:web\.app|firebaseapp\.com)$/
  )
  return match?.groups?.projectId ?? 'nfl-parlay-builder'
}

const projectId = resolveProjectId()

export const API_CONFIG = {
  CLOUD_FUNCTIONS: {
    baseURL: isLocalDevelopment()
      ? `http://localhost:5001/${projectId}/us-central1`
      : `https://us-central1-${projectId}.cloudfunctions.net`,
    endpoints: {
      schedule: '/api/schedule',
      games: (week: number) => `/api/games?week=${week}`,
    },
  },
} as const
