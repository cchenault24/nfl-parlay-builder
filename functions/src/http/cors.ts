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
