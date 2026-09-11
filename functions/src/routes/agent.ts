import express from 'express'
import { runAgent } from '../agent/orchestrator/agent'
import {
  AgentBudgetSchema,
  AgentRun,
  AgentRunSchema,
  AgentStep,
  budgetForGames,
} from '../agent/shared/schemas'
import {
  cancelRun,
  claimRun,
  createRun,
  finishRun,
  getRun,
  listSteps,
  upsertStep,
} from '../agent/store/firestore'
import { verifyAuth, type AuthedRequest } from '../middleware/auth'
import {
  getUserRateLimitStatus,
  rateLimitByUser,
} from '../middleware/rateLimit'
import { log } from '../observability/logger'
import { getSeasonSchedule } from '../providers/espn/client'
import { getEntitlementView } from '../tiering/store'
import { errorResponse } from '../utils/errors'
import { getCurrentSeason } from '../utils/season'
import { resolveRunInput } from './agentRunInput'

export const agentRouter = express.Router()

const RUNS_PER_HOUR = 20
const RATE_WINDOW_MS = 60 * 60_000
const AGENT_RUNS_ROUTE = 'agent_runs_create'
// The daily valve. See PRO_RUNS_PER_DAY in tiering/capabilities.ts for why the
// hourly one alone left the month unbounded. Free is already held by its weekly
// quota, so in practice this only ever applies to Pro.
const RUNS_PER_DAY = 10
const DAY_WINDOW_MS = 24 * 60 * 60_000
const AGENT_RUNS_DAILY_ROUTE = 'agent_runs_create_daily'
const isEmulator = () =>
  !!process.env.FUNCTIONS_EMULATOR || !!process.env.FIREBASE_AUTH_EMULATOR_HOST

const persist = { upsertStep, getRun, finishRun }

type Handler = (req: AuthedRequest, res: express.Response) => Promise<unknown>

// Express 4 drops async rejections; turn them into a JSON 500 instead.
const route =
  (handler: Handler): express.RequestHandler =>
  async (req, res) => {
    const authed = req as AuthedRequest
    try {
      await handler(authed, res)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      log.error('api.agent.unhandled', {
        correlationId: authed.correlationId,
        path: req.path,
        error: { code: 'internal_error', message },
      })
      if (!res.headersSent) {
        errorResponse(res, 500, 'internal_error', message, authed.correlationId)
      }
    }
  }

function rateLimitFor(uid: string) {
  return isEmulator()
    ? Promise.resolve({
        remaining: 9999,
        total: 9999,
        resetTime: new Date(),
        currentCount: 0,
      })
    : getUserRateLimitStatus(
        uid,
        AGENT_RUNS_ROUTE,
        RUNS_PER_HOUR,
        RATE_WINDOW_MS
      )
}

async function ownedRun(req: AuthedRequest, res: express.Response) {
  const run = await getRun(req.params.id)
  if (!run || run.userId !== req.user?.uid) {
    errorResponse(res, 404, 'not_found', 'Run not found', req.correlationId)
    return null
  }
  return run
}

agentRouter.post(
  '/agent/runs',
  verifyAuth,
  ...(isEmulator()
    ? []
    : [
        rateLimitByUser(RUNS_PER_HOUR, RATE_WINDOW_MS, AGENT_RUNS_ROUTE),
        rateLimitByUser(RUNS_PER_DAY, DAY_WINDOW_MS, AGENT_RUNS_DAILY_ROUTE),
      ]),
  route(async (req, res) => {
    const { correlationId, user } = req
    if (!user) {
      return errorResponse(
        res,
        401,
        'unauthorized',
        'Missing user',
        correlationId
      )
    }
    // The schedule is needed to check that every requested game exists and that
    // they share a week. One cached call however many games were asked for.
    let schedule
    try {
      schedule = await getSeasonSchedule(getCurrentSeason())
    } catch (e) {
      log.error('api.agent.schedule.error', {
        correlationId,
        error: {
          code: 'schedule_unavailable',
          message: e instanceof Error ? e.message : String(e),
        },
      })
      return errorResponse(
        res,
        502,
        'schedule_unavailable',
        'Could not load the NFL schedule to check those games.',
        correlationId
      )
    }

    // Entitlements are enforced here rather than in the UI alone: the locked
    // controls are an upsell, not a security boundary, and this endpoint is
    // reachable directly.
    const entitlements = await getEntitlementView(user.uid)
    const { input, refusal } = resolveRunInput({
      body: req.body,
      entitlements,
      schedule,
    })
    if (refusal) {
      return errorResponse(
        res,
        refusal.status,
        refusal.code,
        refusal.message,
        correlationId,
        refusal.details
      )
    }

    const now = new Date().toISOString()
    const run: AgentRun = AgentRunSchema.parse({
      id: `run_${Math.random().toString(36).slice(2)}`,
      userId: user.uid,
      createdAt: now,
      updatedAt: now,
      status: 'queued',
      correlationId,
      budget: AgentBudgetSchema.parse({
        maxRunMs: budgetForGames(input.gameIds.length),
      }),
      input,
    })
    await createRun(run)
    log.info('api.agent.create', {
      correlationId,
      runId: run.id,
      userId: user.uid,
    })
    res.json({ runId: run.id, rateLimitInfo: await rateLimitFor(user.uid) })
  })
)

agentRouter.get(
  '/agent/runs/:id',
  verifyAuth,
  route(async (req, res) => {
    const run = await ownedRun(req, res)
    if (run) {
      res.json(run)
    }
  })
)

// Execution happens here, not in POST /agent/runs. A run only makes
// progress while some request is actively held open on its instance — Cloud
// Run throttles CPU to near-zero once a response has been sent, so kicking
// the agent off from the POST handler and returning immediately left it
// racing the platform for CPU with no guarantee it would ever get any. This
// request claims the run (atomically, so only one caller ever executes it)
// and drives it to completion itself, pushing each step straight to the
// client as it happens. A second stream request for the same run (e.g. a
// duplicate tab) loses the claim and just mirrors Firestore instead.
agentRouter.get(
  '/agent/runs/:id/stream',
  verifyAuth,
  route(async (req, res) => {
    const run = await ownedRun(req, res)
    if (!run) {
      return
    }
    const { correlationId } = req
    const runId = run.id
    log.info('api.agent.stream.start', { correlationId, runId })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    let closed = false
    const send = (event: string, data: unknown) => {
      if (!closed) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      }
    }
    const finish = () => {
      if (!closed) {
        closed = true
        res.end()
      }
    }

    const claimed = await claimRun(runId)
    if (claimed) {
      const controller = new AbortController()
      req.on('close', () => controller.abort())
      // Belt-and-suspenders for cancellation: a cross-tab (or otherwise
      // out-of-band) /cancel call only writes to Firestore, and relying on
      // this same request's own connection actually closing to notice it
      // isn't dependable through every proxy this request may sit behind.
      // Polling directly makes a cancel take effect in ~2s regardless.
      const cancelWatcher = setInterval(() => {
        if (controller.signal.aborted) {
          return
        }
        getRun(runId).then(latest => {
          if (latest?.status === 'canceled') {
            controller.abort()
          }
        })
      }, 2000)

      const sentSteps = new Set<string>()
      send('status', { status: 'running' })
      await runAgent(claimed, persist, {
        signal: controller.signal,
        onStep: (step: AgentStep) => {
          sentSteps.add(step.id)
          send('step', step)
        },
      })
      clearInterval(cancelWatcher)

      // Steps upserted directly by runAgent may have been missed if this
      // exact step id was already sent mid-flight is fine (idempotent), but
      // pick up anything the callback path didn't cover for completeness.
      const finalSteps = await listSteps(runId)
      for (const step of finalSteps) {
        if (!sentSteps.has(step.id)) {
          send('step', step)
        }
      }

      const finalRun = await getRun(runId)
      if (finalRun?.status === 'succeeded') {
        send('final', finalRun.result)
      } else {
        send(
          'error',
          finalRun?.error ?? { code: 'error', message: 'Run ended' }
        )
      }
      return finish()
    }

    // Someone else is already executing this run (or it's already done) —
    // fall back to mirroring Firestore until it reaches a terminal state.
    const sentSteps = new Map<string, string>()
    let lastStatus: string | undefined
    let timer: NodeJS.Timeout | undefined
    req.on('close', () => {
      closed = true
      clearTimeout(timer)
    })

    const poll = async () => {
      if (closed) {
        return
      }
      try {
        const steps = await listSteps(runId)
        for (const step of steps) {
          const json = JSON.stringify(step)
          if (sentSteps.get(step.id) !== json) {
            sentSteps.set(step.id, json)
            send('step', step)
          }
        }
        const latest = await getRun(runId)
        if (!latest) {
          return finish()
        }
        if (latest.status !== lastStatus) {
          lastStatus = latest.status
          send('status', { status: latest.status })
        }
        if (latest.status === 'succeeded') {
          send('final', latest.result)
          return finish()
        }
        if (latest.status === 'failed' || latest.status === 'canceled') {
          send(
            'error',
            latest.error ?? { code: latest.status, message: 'Run ended' }
          )
          return finish()
        }
      } catch (e) {
        log.warn('api.agent.stream.error', {
          correlationId,
          runId,
          error: { code: 'stream_error', message: String(e) },
        })
        return finish()
      }
      if (!closed) {
        timer = setTimeout(poll, 500)
      }
    }
    await poll()
  })
)

agentRouter.post(
  '/agent/runs/:id/cancel',
  verifyAuth,
  route(async (req, res) => {
    const run = await ownedRun(req, res)
    if (!run) {
      return
    }
    await cancelRun(run.id)
    res.json({ ok: true })
  })
)

agentRouter.get(
  '/agent/rate-limit',
  verifyAuth,
  route(async (req, res) => {
    const { correlationId, user } = req
    if (!user) {
      return errorResponse(
        res,
        401,
        'unauthorized',
        'Missing user',
        correlationId
      )
    }
    res.json(await rateLimitFor(user.uid))
  })
)
