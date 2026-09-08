import express from 'express'
import { runAgent } from '../agent/orchestrator/agent'
import {
  AgentBudgetSchema,
  AgentRun,
  AgentRunSchema,
  RiskLevelSchema,
} from '../agent/shared/schemas'
import {
  createRun,
  getRun,
  listSteps,
  updateRun,
  upsertStep,
} from '../agent/store/firestore'
import { verifyAuth, type AuthedRequest } from '../middleware/auth'
import {
  getUserRateLimitStatus,
  rateLimitByUser,
} from '../middleware/rateLimit'
import { log } from '../observability/logger'
import { errorResponse } from '../utils/errors'

export const agentRouter = express.Router()

const RUNS_PER_HOUR = 20
const RATE_WINDOW_MS = 60 * 60_000
const isEmulator = () =>
  !!process.env.FUNCTIONS_EMULATOR || !!process.env.FIREBASE_AUTH_EMULATOR_HOST

const persist = { upsertStep, updateRun, getRun }

function rateLimitFor(uid: string) {
  return isEmulator()
    ? Promise.resolve({
        remaining: 9999,
        total: 9999,
        resetTime: new Date(),
        currentCount: 0,
      })
    : getUserRateLimitStatus(uid, '/agent/runs', RUNS_PER_HOUR, RATE_WINDOW_MS)
}

agentRouter.post(
  '/agent/runs',
  verifyAuth,
  ...(isEmulator() ? [] : [rateLimitByUser(RUNS_PER_HOUR, RATE_WINDOW_MS)]),
  async (req: express.Request, res: express.Response) => {
    const { correlationId, user } = req as AuthedRequest
    if (!user) {
      return errorResponse(res, 401, 'unauthorized', 'Missing user', correlationId)
    }
    const gameId = String(req.body?.gameId ?? '').trim()
    const risk = RiskLevelSchema.safeParse(req.body?.riskLevel ?? 'moderate')
    if (!gameId || !risk.success) {
      return errorResponse(
        res,
        400,
        'validation_error',
        'gameId is required and riskLevel must be conservative, moderate, or aggressive',
        correlationId
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
      budget: AgentBudgetSchema.parse({}),
      input: { gameId, riskLevel: risk.data },
    })
    await createRun(run)
    log.info('api.agent.create', { correlationId, runId: run.id, userId: user.uid })
    res.json({ runId: run.id, rateLimitInfo: await rateLimitFor(user.uid) })

    updateRun(run.id, { status: 'running' })
      .then(() => runAgent(run, persist))
      .catch(async e => {
        log.error('api.agent.orchestrator_error', {
          correlationId,
          runId: run.id,
          error: { code: 'orchestrator_error', message: String(e) },
        })
        await updateRun(run.id, {
          status: 'failed',
          error: { code: 'orchestrator_error', message: String(e) },
        })
      })
  }
)

agentRouter.get('/agent/runs/:id', verifyAuth, async (req, res) => {
  const { correlationId, user } = req as AuthedRequest
  const run = await getRun(req.params.id)
  if (!run || run.userId !== user?.uid) {
    return errorResponse(res, 404, 'not_found', 'Run not found', correlationId)
  }
  res.json(run)
})

agentRouter.get('/agent/runs/:id/stream', verifyAuth, async (req, res) => {
  const { correlationId, user } = req as AuthedRequest
  const runId = req.params.id
  const run = await getRun(runId)
  if (!run || run.userId !== user?.uid) {
    return errorResponse(res, 404, 'not_found', 'Run not found', correlationId)
  }
  log.info('api.agent.stream.start', { correlationId, runId })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const send = (event: string, data: unknown) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  const sentSteps = new Map<string, string>()
  let lastStatus: string | undefined

  const finish = () => {
    clearInterval(interval)
    res.end()
  }
  req.on('close', () => clearInterval(interval))

  const interval = setInterval(async () => {
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
        finish()
      } else if (latest.status === 'failed' || latest.status === 'canceled') {
        send('error', latest.error ?? { code: latest.status, message: 'Run ended' })
        finish()
      }
    } catch (e) {
      log.warn('api.agent.stream.error', {
        correlationId,
        runId,
        error: { code: 'stream_error', message: String(e) },
      })
      finish()
    }
  }, 500)
})

agentRouter.post('/agent/runs/:id/cancel', verifyAuth, async (req, res) => {
  const { correlationId, user } = req as AuthedRequest
  const run = await getRun(req.params.id)
  if (!run || run.userId !== user?.uid) {
    return errorResponse(res, 404, 'not_found', 'Run not found', correlationId)
  }
  if (run.status === 'queued' || run.status === 'running') {
    await updateRun(run.id, { status: 'canceled' })
  }
  res.json({ ok: true })
})

agentRouter.get('/agent/rate-limit', verifyAuth, async (req, res) => {
  const { correlationId, user } = req as AuthedRequest
  if (!user) {
    return errorResponse(res, 401, 'unauthorized', 'Missing user', correlationId)
  }
  res.json(await rateLimitFor(user.uid))
})
