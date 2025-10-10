import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import * as admin from 'firebase-admin'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'
import type { AuthedRequest } from './middleware/auth'
import { protectedRouter, publicRouter } from './routes'

// Load environment variables from .env files
dotenv.config({ path: '../env.development.local' })
dotenv.config({ path: '../env.production.local' })

// Initialize Firebase Admin once
try {
  admin.app()
} catch {
  admin.initializeApp()
}

// Config
const REGION = 'us-central1'
const CORS_ALLOWLIST = new Set([
  'http://localhost:3001',
  'http://localhost:3000',
  // Production main site
  'https://nfl-parlay-builder.web.app',
  'https://nfl-parlay-builder.firebaseapp.com',
  // Production preview channels (Firebase Hosting)
  /^https:\/\/nfl-parlay-builder(?:--[\w-]+)?\.web\.app\/?$/,
  /^https:\/\/nfl-parlay-builder(?:--[\w-]+)?\.firebaseapp\.com\/?$/,
  // Dev hosting site and preview channels under the dev project
  /^https:\/\/nfl-parlay-builder-dev(?:--[\w-]+)?\.web\.app\/?$/,
  /^https:\/\/nfl-parlay-builder-dev(?:--[\w-]+)?\.firebaseapp\.com\/?$/,
])

// CORS
const corsMiddleware = cors({
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin) {
      return callback(null, true)
    }

    // Check if origin matches any allowlist item (string or regex)
    for (const allowedOrigin of CORS_ALLOWLIST) {
      if (typeof allowedOrigin === 'string' && allowedOrigin === origin) {
        return callback(null, true)
      }
      if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
        return callback(null, true)
      }
    }

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
// Handle preflight requests explicitly
app.options('*', corsMiddleware)
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
