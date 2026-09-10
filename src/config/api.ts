import { getEnvVar } from '../utils'

export const ENV = {
  FIREBASE_PROJECT_ID: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  NODE_ENV: getEnvVar('NODE_ENV') || 'development',
} as const

// The `demo-` prefix is load-bearing: it makes the Firebase SDKs refuse to
// reach any real backend, so a misconfigured local run fails loudly instead of
// quietly reading or writing production. Keep in sync with start-dev.js.
export const LOCAL_PROJECT_ID = 'demo-parlaid'

export const isLocalDevelopment = () => {
  if (typeof window === 'undefined') {
    return ENV.NODE_ENV === 'development'
  }
  const { hostname } = window.location
  return isPrivateHost(hostname)
}

// Every RFC 1918 private range, not just 192.168/16. Vite's --host binds the
// machine's LAN address, which on many networks is 10.x or 172.16-31.x — and a
// hostname this misses is treated as deployed, so the SDKs skip the emulator
// connection and send the deliberately fake `demo-` credentials to real Google,
// which rejects them as an invalid API key. Testing from a phone on the same
// network is the usual way to hit that.
function isPrivateHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true
  }
  const octets = hostname.split('.')
  if (octets.length !== 4 || octets.some(o => !/^\d{1,3}$/.test(o))) {
    return false
  }
  const [a, b] = octets.map(Number)
  if (a > 255 || b > 255) {
    return false
  }
  return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)
}

// Only used locally, where requests go straight to the Functions emulator.
// Everywhere deployed (prod or a PR preview channel) `/api/**` is rewritten
// same-origin to the function by firebase.json, so no project id or
// cross-origin host needs to be known here at all.
function localFunctionsBaseUrl(): string {
  const projectId = ENV.FIREBASE_PROJECT_ID.trim() || LOCAL_PROJECT_ID
  return `http://localhost:5001/${projectId}/us-central1/api`
}

export const API_CONFIG = {
  CLOUD_FUNCTIONS: {
    baseURL: isLocalDevelopment() ? localFunctionsBaseUrl() : '/api',
  },
} as const
