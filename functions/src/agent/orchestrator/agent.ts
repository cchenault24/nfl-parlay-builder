import OpenAI from 'openai'
import { log } from '../../observability/logger'
import { inc, observe, setActiveRuns } from '../../observability/metrics'
import { endSpan, startSpan } from '../../observability/tracing'
import {
  getGame,
  getLeagueAverages,
  getPregameContext,
  getTeamStats,
} from '../../providers/espn/client'
import type { ScheduleGame, TeamStats } from '../../providers/espn/types'
import { getTeamEpa } from '../../providers/nflverse/client'
import { getOddsForGame, type OddsSnapshot } from '../../providers/odds/client'
import {
  PARLAY_MODEL,
  buildParlayPrompt,
  draftParlay,
  getOpenAI,
} from '../../service/ai'
import { bookPriceForLeg } from '../../utils/bookLines'
import { combineAmericanOdds } from '../../utils/odds'
import { getCurrentSeason } from '../../utils/season'
import {
  AgentResult,
  AgentRun,
  AgentStep,
  AgentToolName,
  ProcessedLeg,
} from '../shared/schemas'
import { withResilience } from '../tools'
import { validateDraft } from '../validate'
import type { AILeg } from '../../service/ai/schemas'

export type Persist = {
  upsertStep: (runId: string, step: AgentStep) => Promise<void>
  getRun: (runId: string) => Promise<AgentRun | null>
  finishRun: (runId: string, updates: Partial<AgentRun>) => Promise<boolean>
}

export type RunAgentOptions = {
  // Aborted when the request driving this run disconnects (same-tab cancel)
  // or the caller wants to interrupt a step early, e.g. mid-draft.
  signal?: AbortSignal
  // Called whenever a step is written, so a live caller (the SSE stream) can
  // push it straight to the client instead of polling Firestore for it.
  onStep?: (step: AgentStep) => void
}

// Replaces a spread/total/moneyline leg's line and price with the book's
// exact number whenever that market was actually posted, discarding
// whatever the model wrote for those two fields — a near-miss number can
// never fail validation once it's authoritative by construction. A leg for
// a market the book didn't post (or a player prop, which has none) is left
// with the model's own numbers and marked unanchored.
//
// Anchoring also clears any player name the model attached to a market leg.
// Once the line and price come from the book the leg is a well-formed market
// bet whatever the model meant by that name, so failing the whole run over it
// would cost the user a parlay to protect intent the snap has already
// discarded. An unanchored leg keeps the name, so validation can still reject
// a player prop mislabelled as a market bet, where the numbers are still the
// model's own and the ambiguity is real.
function snapLegToBook(
  rawLeg: AILeg,
  game: ScheduleGame,
  odds: OddsSnapshot | null
): ProcessedLeg {
  // The model doesn't reliably emit a literal null here — normalize an
  // empty string to null once, up front.
  const leg = { ...rawLeg, player: rawLeg.player?.trim() ? rawLeg.player : null }
  const priced = bookPriceForLeg(leg, game, odds)
  if (priced) {
    return { ...leg, player: null, line: priced.line, odds: priced.odds, anchored: true }
  }
  return { ...leg, anchored: false }
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
  // A DOMException/fetch AbortError, or the OpenAI SDK's own
  // APIUserAbortError — neither sets `.code`, and the SDK error's `.name`
  // is inherited as plain "Error" (it never overrides it), so `instanceof`
  // is the only reliable check for the latter.
  if (err instanceof Error && err.name === 'AbortError') {
    return 'canceled'
  }
  if (err instanceof OpenAI.APIUserAbortError) {
    return 'canceled'
  }
  return (err as { code?: string }).code ?? 'error'
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export async function runAgent(
  run: AgentRun,
  persist: Persist,
  opts: RunAgentOptions = {}
): Promise<void> {
  const { signal, onStep } = opts
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
    if (signal?.aborted) {
      throw new RunError('canceled', 'Run was canceled')
    }
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
    onStep?.(record)
    const span = startSpan(`agent.${record.id}`, { ...ctx, parent: rootSpan.ctx })
    try {
      const data = await fn()
      Object.assign(record, {
        status: 'ok',
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - t0,
      })
      await persist.upsertStep(runId, record)
      onStep?.(record)
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
      onStep?.(record)
      endSpan(span, { ...ctx, status: 'error', errorMessage: errorMessage(err) })
      log.warn('agent.step.failed', { ...ctx, stepId: record.id, error: record.error })
      return { data: undefined, step: record }
    }
  }

  const tool = <T>(
    name: AgentToolName,
    fn: () => Promise<T>,
    toolOpts: { retries?: number; nonCircuitErrorCodes?: string[] } = {}
  ) =>
    step(
      'tool',
      () =>
        withResilience(name, fn, {
          timeoutMs: Math.min(remainingMs(), budget.perToolTimeoutMs),
          retries: toolOpts.retries ?? 1,
          nonCircuitErrorCodes: toolOpts.nonCircuitErrorCodes,
        }),
      { tool: name }
    )

  try {
    await step('plan', async () => undefined, {
      notes: 'Load game, gather team stats + book lines, draft, validate',
    })

    const { data: game } = await tool(
      'espn_game',
      () =>
        getGame(getCurrentSeason(), run.input.gameId).then(g => {
          if (!g) {
            throw new RunError('game_not_found', `Game ${run.input.gameId} not found`)
          }
          return g
        }),
      { nonCircuitErrorCodes: ['game_not_found'] }
    )
    if (!game) {
      throw new RunError('game_not_found', 'Could not load the selected game')
    }
    if (game.status !== 'scheduled') {
      throw new RunError('game_not_open', `Game is ${game.status.replace('_', ' ')}`)
    }

    const [statsResult, oddsResult, pregameResult, epaResult] = await Promise.all([
      tool('espn_team_stats', () =>
        Promise.all([
          getTeamStats(game.home.teamId, game.season),
          getTeamStats(game.away.teamId, game.season),
        ])
      ),
      tool('odds', () => getOddsForGame(game), {
        retries: 0,
        nonCircuitErrorCodes: [
          'odds_not_found',
          'odds_no_bookmaker',
          'odds_not_configured',
        ],
      }),
      tool('espn_pregame', () =>
        getPregameContext(game.gameId, game.home.teamId, game.away.teamId)
      ),
      tool('nflverse_epa', () =>
        getTeamEpa(game.home.abbrev, game.away.abbrev, game.season)
      ),
    ])
    const [homeStats, awayStats]: [TeamStats | null, TeamStats | null] =
      statsResult.data ?? [null, null]
    const odds: OddsSnapshot | null = oddsResult.data ?? null
    const pregame = pregameResult.data ?? null
    const epa = epaResult.data ?? null
    // Supplementary context only, so a failure here shouldn't be a tracked
    // step or fail the run — worth less than the tool-wrapped calls above.
    const leagueAverages = await getLeagueAverages(game.season).catch(() => null)

    const client = getOpenAI()
    if (!client) {
      throw new RunError('ai_unavailable', 'OpenAI client not configured')
    }
    const prompt = buildParlayPrompt({
      game,
      homeStats,
      awayStats,
      odds,
      pregame,
      leagueAverages,
      epa,
      riskLevel: run.input.riskLevel,
    })
    const draftStep = await step('draft', async () => {
      const result = await draftParlay(client, prompt, signal)
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

    const snappedLegs = draft.legs.map(leg => snapLegToBook(leg, game, odds))

    let validationIssues: string[] = []
    const validation = await step('validate', async () => {
      validationIssues = validateDraft(
        { legs: snappedLegs, analysisSummary: draft.analysisSummary },
        game
      )
      if (validationIssues.length > 0) {
        throw new RunError(
          'validation_error',
          `Draft failed validation: ${validationIssues.join('; ')}`,
          validationIssues
        )
      }
      return validationIssues
    })
    if (!validation.data) {
      throw new RunError(
        'validation_error',
        'The model produced an invalid parlay',
        validationIssues
      )
    }

    const result: AgentResult = {
      parlay: {
        legs: snappedLegs,
        combinedOdds: combineAmericanOdds(snappedLegs.map(l => l.odds)),
        parlayConfidence: Math.min(...snappedLegs.map(l => l.confidence)),
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
    await persist.finishRun(runId, {
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
    await persist.finishRun(runId, {
      status: code === 'canceled' ? 'canceled' : 'failed',
      error: { code, message, details },
    })
    inc(code === 'canceled' ? 'runs_canceled' : 'runs_failed')
    log.warn('agent.run.failed', { ...ctx, error: { code, message } })
    endSpan(rootSpan, { ...ctx, status: 'error', errorMessage: message })
  } finally {
    setActiveRuns(-1)
  }
}
