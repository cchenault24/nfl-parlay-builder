import cors from 'cors'
import express from 'express'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'
import { app as firebaseApp } from './firebase'
import { log } from './observability/logger'
import type { AuthedRequest } from './middleware/auth'
import { missingBillingVars } from './billing/config'
import {
  accountRouter,
  agentRouter,
  billingRouter,
  entitlementsRouter,
  gradingRouter,
  metricsRouter,
  publicRouter,
  sharingRouter,
} from './routes'

firebaseApp()

const missingBilling = missingBillingVars()
if (missingBilling.length > 0) {
  log.info('billing.disabled', { missing: missingBilling })
}

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
// Stripe verifies its webhook signature against the exact bytes it sent, so
// this route has to keep its raw body. express.raw marks the body as already
// read, which makes the JSON parser below skip it — hence the ordering. Both
// mount points are listed because the router is mounted at "/" and "/api"
// (see the note further down) and Stripe is configured against one of them.
app.use(
  ['/billing/webhooks/stripe', '/api/billing/webhooks/stripe'],
  express.raw({ type: 'application/json' })
)
app.use(express.json({ limit: '100kb' }))

const apiRouter = express.Router()
apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true })
})
apiRouter.use('/', publicRouter)
apiRouter.use('/', agentRouter)
apiRouter.use('/', entitlementsRouter)
apiRouter.use('/', billingRouter)
apiRouter.use('/', metricsRouter)
apiRouter.use('/', gradingRouter)
apiRouter.use('/', sharingRouter)
apiRouter.use('/', accountRouter)

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
    // Billing's secrets are deliberately NOT bound here. Firebase validates
    // every bound secret before it deploys anything, so one missing value
    // aborts functions and hosting together — which is precisely what happened
    // when tiering merged. See billing/config.ts for how to turn billing on.
    secrets: [OPENAI_API_KEY, ODDS_API_KEY],
    // The streaming route holds this request open for the whole agent run, so
    // this ceiling is the run's real ceiling. A cross-game run is budgeted at
    // 90s + 20s per extra game (agent/shared/schemas.ts), which reaches 190s at
    // the six-game cap — past 120s, and the instance would be killed after the
    // model tokens had already been spent. Raising it here lifts the ceiling for
    // every route; splitting the stream into its own function is the better
    // shape and is the follow-up if held instance-seconds show up in the bill.
    timeoutSeconds: 300,
  },
  app
)

// Scheduled work. Exported separately so a failure in a background job can
// never take the request-serving function down with it.
export { gradeParlaysSweep } from './scheduled/gradeParlays'
export { captureClosingLinesSweep } from './scheduled/captureClosingLines'
export { reapStaleRunsSweep } from './scheduled/reapStaleRuns'
