import cors from 'cors'
import express from 'express'
import * as admin from 'firebase-admin'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'
import type { AuthedRequest } from './middleware/auth'
import { protectedRouter, publicRouter } from './routes'

// Initialize Firebase Admin once
try {
  admin.app()
} catch (_) {
  admin.initializeApp()
}

// Config
const REGION = 'us-central1'
const CORS_ALLOWLIST = new Set([
  'http://localhost:3001',
  'http://localhost:3000',
  'https://nfl-parlay-builder.web.app',
])

// CORS
const corsMiddleware = cors({
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin || CORS_ALLOWLIST.has(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
})

// Express app
const app = express()
app.use(
  (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction
  ) => {
    ;(req as AuthedRequest).correlationId =
      (req.headers['x-correlation-id'] as string) ||
      `req_${Math.random().toString(36).slice(2)}`
    next()
  }
)
app.use(corsMiddleware)
app.use(express.json({ limit: '1mb' }))

// Health
app.get('/v2/health', (_req: express.Request, res: express.Response) => {
  res.json({ ok: true })
})

// Mount routers
app.use('/v2', publicRouter)
app.use('/v2', protectedRouter)

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY')

export const api = onRequest({ region: REGION, secrets: [OPENAI_API_KEY] }, app)
