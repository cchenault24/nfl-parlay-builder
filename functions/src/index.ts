import cors from 'cors'
import express from 'express'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'
import { app as firebaseApp } from './firebase'
import type { AuthedRequest } from './middleware/auth'
import {
  agentRouter,
  gradingRouter,
  metricsRouter,
  publicRouter,
  sharingRouter,
} from './routes'

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

const apiRouter = express.Router()
apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true })
})
apiRouter.use('/', publicRouter)
apiRouter.use('/', agentRouter)
apiRouter.use('/', metricsRouter)
apiRouter.use('/', gradingRouter)
apiRouter.use('/', sharingRouter)

// Two mount points for the same routes: direct Cloud Functions access
// (https://REGION-PROJECT.cloudfunctions.net/api/...) has "api" — this
// function's name — consumed as the first path segment before Express ever
// sees the request, leaving just "/...". Firebase Hosting's rewrite (see
// firebase.json) instead forwards the original same-origin request straight
// to the underlying Cloud Run service with "/api/..." intact, since there is
// no function-name segment on that URL to strip. Mounting at both "/" and
// "/api" serves both callers without either needing to know which one it is.
app.use('/', apiRouter)
app.use('/api', apiRouter)

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

// Scheduled work. Exported separately so a failure in a background job can
// never take the request-serving function down with it.
export { gradeParlaysSweep } from './scheduled/gradeParlays'
export { captureClosingLinesSweep } from './scheduled/captureClosingLines'

// sendKickoffReminders is deliberately not exported. It declares
// RESEND_API_KEY, and Firebase validates every declared secret before it
// deploys anything — so while that secret does not exist, exporting this
// fails the whole deploy, functions and hosting alike, over one optional
// feature. The implementation is complete and stays in
// ./scheduled/sendReminders; create the secret, restore this export and the
// menu toggle in src/components/auth/UserMenu.tsx, and it is live again.
