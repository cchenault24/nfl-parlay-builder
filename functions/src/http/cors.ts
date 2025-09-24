// Minimal CORS helper for Firebase HTTPS functions (per-function style)

const ALLOWED_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
const ALLOWED_HEADERS = 'Content-Type, Authorization'

function setCorsHeaders(req: any, res: any) {
  const origin = (req.headers?.origin as string) || '*'
  res.set('Access-Control-Allow-Origin', origin)
  res.set('Vary', 'Origin') // so caches vary by origin
  res.set('Access-Control-Allow-Methods', ALLOWED_METHODS)
  res.set('Access-Control-Allow-Headers', ALLOWED_HEADERS)
  res.set('Access-Control-Max-Age', '3600')
}

export function handleWithCors(
  handler: (req: any, res: any) => any | Promise<any>
) {
  return async (req: any, res: any) => {
    setCorsHeaders(req, res)

    // Short-circuit preflight
    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }

    // Proceed to actual handler
    try {
      await handler(req, res)
    } catch (err: any) {
      // Ensure CORS headers are still present on error
      setCorsHeaders(req, res)
      const msg = err?.message ?? 'Internal error'
      res.status(500).json({ error: msg })
    }
  }
}

// Robust CORS helper for Firebase HTTPS functions (Express-style)
// - Reflects allowed origins (no wildcard when using credentials)
// - Handles OPTIONS preflight correctly (including dynamic request headers)
// - Keeps headers on both success and error paths

// Allowlist: add production domains via env, and permissive local dev hosts.
// Example env: CORS_ALLOWED_ORIGINS="https://app.example.com,https://www.example.com"
const ENV_ALLOWED = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

// Local dev/default allow rules (regex checks against req.headers.origin)
const LOCAL_ORIGIN_REGEXES: RegExp[] = [
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^https?:\/\/192\.168\.\d+\.\d+(?::\d+)?$/i, // your LAN (covers 192.168.68.100)
]
