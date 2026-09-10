// The web client resolves this as same-origin `/api` in production (rewritten
// to the function by firebase.json) and localhost:5001 when local. A native
// app has no origin to be same as, so the absolute URL has to be supplied.
const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL

if (!baseUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_API_BASE_URL. Copy mobile/.env.example to mobile/.env.local and fill it in.'
  )
}

export const API_BASE_URL = baseUrl
