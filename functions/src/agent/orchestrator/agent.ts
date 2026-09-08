import { log } from '../../observability/logger'
import { inc, observe, setActiveRuns } from '../../observability/metrics'
import { endSpan, startSpan } from '../../observability/tracing'
import { getGame, getTeamStats } from '../../providers/espn/client'
import type { ScheduleGame, TeamStats } from '../../providers/espn/types'
import { getOddsForGame, type OddsSnapshot } from '../../providers/odds/client'
import {
  PARLAY_MODEL,
  buildParlayPrompt,
  draftParlay,
  getOpenAI,
} from '../../service/ai'
import { combineAmericanOdds } from '../../utils/odds'
import { getCurrentSeason } from '../../utils/season'
import {
  AgentResult,
  AgentRun,
  AgentStep,
  AgentToolName,
} from '../shared/schemas'
import { withResilience } from '../tools'
import { validateDraft } from '../validate'

export type Persist = {
  upsertStep: (runId: string, step: AgentStep) => Promise<void>
  updateRun: (runId: string, updates: Partial<AgentRun>) => Promise<void>
  getRun: (runId: string) => Promise<AgentRun | null>
}

class RunError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
  }
}

function errorCode(err: unknown): string {
  return (err as { code?: string }).code ?? 'error'
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export async function runAgent(run: AgentRun, persist: Persist): Promise<void> {
  const startedAt = Date.now()
  const { id: runId, correlationId, budget } = run
  const ctx = { correlationId, runId }
  setActiveRuns(1)
  inc('runs_started')
  const rootSpan = startSpan('agent.run', { ...ctx, attrs: { userId: run.userId } })
  log.info('agent.run.start', { ...ctx, userId: run.userId })

  const remainingMs = () => budget.maxRunMs - (Date.now() - startedAt)

  async function step<T>(
    type: AgentStep['type'],
    fn: () => Promise<T>,
    opts: { tool?: AgentToolName; notes?: string } = {}
  ): Promise<{ data: T | undefined; step: AgentStep }> {
    if (remainingMs() <= 0) {
      throw new RunError('budget_exceeded', 'Run exceeded its time budget')
    }
    const current = await persist.getRun(runId)
    if (current?.status === 'canceled') {
      throw new RunError('canceled', 'Run was canceled')
    }
    const t0 = Date.now()
    const record: AgentStep = {
      id: `step_${type}${opts.tool ? `_${opts.tool}` : ''}`,
      type,
      tool: opts.tool,
      status: 'running',
      startedAt: new Date(t0).toISOString(),
      notes: opts.notes,
    }
    await persist.upsertStep(runId, record)
    const span = startSpan(`agent.${record.id}`, { ...ctx, parent: rootSpan.ctx })
    try {
      const data = await fn()
      Object.assign(record, {
        status: 'ok',
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - t0,
      })
      await persist.upsertStep(runId, record)
      endSpan(span, ctx)
      return { data, step: record }
    } catch (err) {
      Object.assign(record, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - t0,
        error: { code: errorCode(err), message: errorMessage(err) },
      })
      await persist.upsertStep(runId, record)
      endSpan(span, { ...ctx, status: 'error', errorMessage: errorMessage(err) })
      log.warn('agent.step.failed', { ...ctx, stepId: record.id, error: record.error })
      return { data: undefined, step: record }
    }
  }

  const tool = <T>(name: AgentToolName, fn: () => Promise<T>, retries = 1) =>
    step('tool', () =>
      withResilience(name, fn, {
        timeoutMs: Math.min(remainingMs(), budget.perToolTimeoutMs),
        retries,
      }),
      { tool: name }
    )

  try {
    await step('plan', async () => undefined, {
      notes: 'Load game, gather team stats + book lines, draft, validate',
    })

    const { data: game } = await tool('espn_game', () =>
      getGame(getCurrentSeason(), run.input.gameId).then(g => {
        if (!g) {
          throw new RunError('game_not_found', `Game ${run.input.gameId} not found`)
        }
        return g
      })
    )
    if (!game) {
      throw new RunError('game_not_found', 'Could not load the selected game')
    }
    if (game.status !== 'scheduled') {
      throw new RunError('game_not_open', `Game is ${game.status.replace('_', ' ')}`)
    }

    const [statsResult, oddsResult] = await Promise.all([
      tool('espn_team_stats', () =>
        Promise.all([
          getTeamStats(game.home.teamId, game.season),
          getTeamStats(game.away.teamId, game.season),
        ])
      ),
      tool('odds', () => getOddsForGame(game), 0),
    ])
    const [homeStats, awayStats]: [TeamStats | null, TeamStats | null] =
      statsResult.data ?? [null, null]
    const odds: OddsSnapshot | null = oddsResult.data ?? null

    const client = getOpenAI()
    if (!client) {
      throw new RunError('ai_unavailable', 'OpenAI client not configured')
    }
    const prompt = buildParlayPrompt({
      game,
      homeStats,
      awayStats,
      odds,
      riskLevel: run.input.riskLevel,
    })
    const draftStep = await step('draft', async () => {
      const result = await draftParlay(client, prompt)
      observe('draft_tokens_output', result.tokensOutput)
      return result
    })
    if (!draftStep.data) {
      throw new RunError(
        draftStep.step.error?.code ?? 'draft_failed',
        draftStep.step.error?.message ?? 'Draft failed'
      )
    }
    const { draft, tokensInput, tokensOutput } = draftStep.data
    await persist.upsertStep(runId, { ...draftStep.step, tokensInput, tokensOutput })

    const validation = await step('validate', async () => {
      const issues = validateDraft(draft, game, odds)
      if (issues.length > 0) {
        throw new RunError('validation_error', 'Draft failed validation', issues)
      }
      return issues
    })
    if (!validation.data) {
      throw new RunError(
        'validation_error',
        'The model produced legs that do not match the book lines',
        validation.step.error?.message
      )
    }

    const result: AgentResult = {
      parlay: {
        legs: draft.legs,
        combinedOdds: combineAmericanOdds(draft.legs.map(l => l.odds)),
        parlayConfidence: Math.min(...draft.legs.map(l => l.confidence)),
        gameSummary: draft.analysisSummary,
      },
      game: game satisfies ScheduleGame,
      homeStats,
      awayStats,
      odds,
      sources: {
        stats: homeStats && awayStats ? 'ok' : 'unavailable',
        odds: odds ? 'ok' : 'unavailable',
        weather: game.weather ? 'ok' : game.venue?.indoor ? 'indoor' : 'unavailable',
      },
      model: PARLAY_MODEL,
    }
    await persist.updateRun(runId, {
      status: 'succeeded',
      result,
      tokensInput,
      tokensOutput,
    })
    inc('runs_succeeded')
    observe('run_duration_ms', Date.now() - startedAt)
    log.info('agent.run.succeeded', ctx)
    endSpan(rootSpan, { ...ctx, status: 'ok' })
  } catch (err) {
    const code = err instanceof RunError ? err.code : errorCode(err)
    const message = errorMessage(err)
    const details = err instanceof RunError ? err.details : undefined
    if (code !== 'canceled') {
      await persist.updateRun(runId, {
        status: 'failed',
        error: { code, message, details },
      })
    }
    inc(code === 'canceled' ? 'runs_canceled' : 'runs_failed')
    log.warn('agent.run.failed', { ...ctx, error: { code, message } })
    endSpan(rootSpan, { ...ctx, status: 'error', errorMessage: message })
  } finally {
    setActiveRuns(-1)
  }
}
