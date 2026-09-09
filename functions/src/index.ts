import cors from 'cors'
import express from 'express'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'
import { app as firebaseApp } from './firebase'
import type { AuthedRequest } from './middleware/auth'
import { agentRouter, metricsRouter, publicRouter } from './routes'

firebaseApp()

const REGION = 'us-central1'
const CORS_ALLOWLIST: Array<string | RegExp> = [
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/nfl-parlay-builder(?:-dev)?(?:--[\w-]+)?\.(?:web\.app|firebaseapp\.com)$/,
]

const app = express()
// Cloud Run sits behind exactly one Google Front End hop, so req.ip is the
// real client address only once we trust that one hop — otherwise every
// visitor shares the load balancer's IP and one shared rate-limit bucket.
app.set('trust proxy', 1)
app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
  ;(req as AuthedRequest).correlationId =
    (req.headers['x-correlation-id'] as string) ||
    `req_${Math.random().toString(36).slice(2)}`
  next()
})
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        CORS_ALLOWLIST.some(o =>
          typeof o === 'string' ? o === origin : o.test(origin)
        )
      ) {
        return callback(null, true)
      }
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '100kb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})
app.use('/', publicRouter)
app.use('/', agentRouter)
app.use('/', metricsRouter)

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY')
const ODDS_API_KEY = defineSecret('ODDS_API_KEY')

export const api = onRequest(
  {
    region: REGION,
    secrets: [OPENAI_API_KEY, ODDS_API_KEY],
    timeoutSeconds: 120,
  },
  app
)
