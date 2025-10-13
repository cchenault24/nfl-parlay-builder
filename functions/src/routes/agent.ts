import express from 'express'
import { runAgent } from '../agent/orchestrator/agent'
import {
  AgentBudgetSchema,
  AgentRun,
  AgentRunSchema,
} from '../agent/shared/schemas'
import {
  appendStep,
  createRun,
  getRun,
  listSteps,
  updateRun,
} from '../agent/store/firestore'
import { verifyAuth, type AuthedRequest } from '../middleware/auth'
import { rateLimitByUser } from '../middleware/rateLimit'
import { log } from '../observability/logger'
import { inc, observe } from '../observability/metrics'
import { errorResponse } from '../utils/errors'

export const agentRouter = express.Router()

// POST /agent/runs -> { runId }
agentRouter.post(
  '/agent/runs',
  verifyAuth,
  rateLimitByUser(30, 60_000),
  async (req: express.Request, res: express.Response) => {
    const auth = req as AuthedRequest
    const correlationId = auth.correlationId
    const user = auth.user
    log.info('api.agent.create', { correlationId, userId: user?.uid })
    if (!user) {
      return errorResponse(
        res,
        401,
        'unauthorized',
        'Missing user',
        correlationId
      )
    }

    const budget = AgentBudgetSchema.partial().parse(req.body?.budget || {})
    const rlRaw = String(req.body?.riskLevel || 'medium').toLowerCase()
    const normalizedRisk = ((): 'low' | 'medium' | 'high' => {
      if (rlRaw === 'conservative' || rlRaw === 'low') {
        return 'low'
      }
      if (rlRaw === 'aggressive' || rlRaw === 'high') {
        return 'high'
      }
      return 'medium'
    })()

    const run: AgentRun = AgentRunSchema.parse({
      id: `run_${Math.random().toString(36).slice(2)}`,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'queued',
      correlationId,
      budget: {
        maxRunMs: budget.maxRunMs ?? 90_000,
        maxModelTokens: budget.maxModelTokens ?? 20_000,
        maxSteps: budget.maxSteps ?? 8,
        perToolTimeoutMs: budget.perToolTimeoutMs ?? 2_000,
      },
      input: {
        gameId: String(req.body?.gameId || ''),
        ...(req.body?.gameContext && { gameContext: req.body.gameContext }), // Only include if defined
        numLegs: Number(req.body?.numLegs || 3),
        riskLevel: normalizedRisk,
      },
      tokensInput: 0,
      tokensOutput: 0,
      steps: [],
    })

    // Debug logging - Agent input received
    console.info('🤖 [Agent Route] Agent run created with input:', {
      runId: run.id,
      gameId: run.input.gameId,
      hasGameContext: !!run.input.gameContext,
      gameContext: run.input.gameContext
        ? {
            homeTeam: run.input.gameContext.home.name,
            awayTeam: run.input.gameContext.away.name,
            venue: run.input.gameContext.venue,
            week: run.input.gameContext.week,
            dateTime: run.input.gameContext.dateTime,
          }
        : null,
      riskLevel: run.input.riskLevel,
      numLegs: run.input.numLegs,
    })

    if (!run.input.gameId || run.input.numLegs !== 3) {
      return errorResponse(
        res,
        400,
        'validation_error',
        'gameId required and numLegs must be 3',
        correlationId
      )
    }
    await createRun(run)
    res.json({ runId: run.id })

    // Fire and forget execution
    ;(async () => {
      try {
        const t0 = Date.now()
        await updateRun(run.id, {
          status: 'running',
          updatedAt: new Date().toISOString(),
        })
        await runAgent(run, { appendStep, updateRun })
        observe('api_create_to_finish_ms', Date.now() - t0)
      } catch (e) {
        await updateRun(run.id, {
          status: 'failed',
          updatedAt: new Date().toISOString(),
          error: {
            code: 'orchestrator_error',
            message: e instanceof Error ? e.message : String(e),
          },
        })
        inc('runs_failed')
      }
    })()
  }
)

// GET /agent/runs/:id
agentRouter.get('/agent/runs/:id', verifyAuth, async (req, res) => {
  const auth = req as AuthedRequest
  const correlationId = auth.correlationId
  const run = await getRun(req.params.id)
  if (!run) {
    return errorResponse(res, 404, 'not_found', 'Run not found', correlationId)
  }
  res.json(run)
})

// GET /agent/runs/:id/stream (SSE)
agentRouter.get('/agent/runs/:id/stream', verifyAuth, async (req, res) => {
  const auth = req as AuthedRequest
  const correlationId = auth.correlationId
  const runId = req.params.id
  log.info('api.agent.stream.start', { correlationId, runId })
  const run = await getRun(runId)
  if (!run) {
    return errorResponse(res, 404, 'not_found', 'Run not found', correlationId)
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  let lastSent = 0
  const interval = setInterval(async () => {
    try {
      const steps = await listSteps(runId)
      const toSend = steps.slice(lastSent)
      for (const s of toSend) {
        res.write(`event: step\n`)
        res.write(`data: ${JSON.stringify(s)}\n\n`)
      }
      lastSent = steps.length
      const latest = await getRun(runId)
      if (!latest) {
        clearInterval(interval)
        res.end()
        return
      }
      if (latest.status === 'succeeded') {
        res.write(`event: final\n`)
        res.write(`data: ${JSON.stringify(latest.result)}\n\n`)
        clearInterval(interval)
        res.end()
      }
      if (latest.status === 'failed' || latest.status === 'canceled') {
        res.write(`event: error\n`)
        res.write(
          `data: ${JSON.stringify(latest.error || { code: latest.status })}\n\n`
        )
        clearInterval(interval)
        res.end()
      }
    } catch {
      clearInterval(interval)
      try {
        res.end()
      } catch {
        void 0
      }
      log.warn('api.agent.stream.error', { correlationId, runId })
    }
  }, 750)
})

// POST /agent/runs/:id/cancel
agentRouter.post('/agent/runs/:id/cancel', verifyAuth, async (req, res) => {
  const auth = req as AuthedRequest
  const correlationId = auth.correlationId
  const runId = req.params.id
  const run = await getRun(runId)
  if (!run) {
    return errorResponse(res, 404, 'not_found', 'Run not found', correlationId)
  }
  await updateRun(runId, {
    status: 'canceled',
    updatedAt: new Date().toISOString(),
  })
  res.json({ ok: true })
})
