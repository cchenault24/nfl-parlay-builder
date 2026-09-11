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
import type {
  PregameContext,
  ScheduleGame,
  TeamStats,
} from '../../providers/espn/types'
import { getTeamEpa } from '../../providers/nflverse/client'
import type { TeamEpaStats } from '../../providers/nflverse/types'
import { getOddsForGame, type OddsSnapshot } from '../../providers/odds/client'
import {
  PARLAY_MODEL,
  buildParlayPrompt,
  draftParlay,
  getOpenAI,
  type PromptGame,
} from '../../service/ai'
import { bookPriceForLeg } from '../../utils/bookLines'
import { combineAmericanOdds } from '../../utils/odds'
import { getCurrentSeason } from '../../utils/season'
import {
  AgentResult,
  AgentRun,
  AgentStep,
  AgentToolName,
  DraftPreview,
  ProcessedLeg,
} from '../shared/schemas'
import { withResilience } from '../tools'
import {
  attachGameIds,
  teamToGame,
  validateDraft,
  validationSummary,
} from '../validate'
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
  // Called as the draft is generated, with the partial document so far. Live
  // callers only: unlike steps this is never persisted, because it is worth
  // nothing once the real draft exists.
  onDraft?: (preview: DraftPreview) => void
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
  const leg = {
    ...rawLeg,
    player: rawLeg.player?.trim() ? rawLeg.player : null,
  }
  const priced = bookPriceForLeg(leg, game, odds)
  if (priced) {
    return {
      ...leg,
      player: null,
      line: priced.line,
      odds: priced.odds,
      anchored: true,
    }
  }
  return { ...leg, anchored: false }
}

// Runs a provider call for every game in the slate. A per-game failure becomes
// a null for that game rather than failing the step: one game whose lines are
// not posted yet must not blank the other five. The step only fails when every
// game failed, and it then fails with the first game's error so the circuit
// breaker and `nonCircuitErrorCodes` still see the real code.
async function perGame<T>(
  games: ScheduleGame[],
  fn: (game: ScheduleGame) => Promise<T>,
  onProgress?: (done: number, total: number) => void
): Promise<(T | null)[]> {
  let done = 0
  const settled = await Promise.allSettled(
    games.map(game =>
      fn(game).finally(() => {
        done += 1
        onProgress?.(done, games.length)
      })
    )
  )
  const firstRejection = settled.find(r => r.status === 'rejected')
  if (firstRejection && settled.every(r => r.status === 'rejected')) {
    throw firstRejection.reason
  }
  return settled.map(r => (r.status === 'fulfilled' ? r.value : null))
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
  const { signal, onStep, onDraft } = opts
  const startedAt = Date.now()
  const { id: runId, correlationId, budget } = run
  const ctx = { correlationId, runId }
  setActiveRuns(1)
  inc('runs_started')
  const rootSpan = startSpan('agent.run', {
    ...ctx,
    attrs: { userId: run.userId },
  })
  log.info('agent.run.start', { ...ctx, userId: run.userId })

  const remainingMs = () => budget.maxRunMs - (Date.now() - startedAt)

  // Handed to every step's body so a step spanning several games can say how
  // far through it is. Single-game runs never call it, so nothing changes for
  // them — not the step shape, and not the number of Firestore writes.
  type StepContext = { progress: (done: number, total: number) => void }

  async function step<T>(
    type: AgentStep['type'],
    fn: (ctx: StepContext) => Promise<T>,
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
    // Mutated in place through the step's life. Every handoff below takes a
    // snapshot, so a consumer that keeps what it was given never sees it change
    // underneath — the live stream and Firestore must agree on what a step
    // looked like at the moment it was sent.
    const record: AgentStep = {
      id: `step_${type}${opts.tool ? `_${opts.tool}` : ''}`,
      type,
      tool: opts.tool,
      status: 'running',
      startedAt: new Date(t0).toISOString(),
      notes: opts.notes,
    }
    await persist.upsertStep(runId, { ...record })
    onStep?.({ ...record })
    const span = startSpan(`agent.${record.id}`, {
      ...ctx,
      parent: rootSpan.ctx,
    })
    // Progress writes are not awaited by the caller — a slow write must never
    // hold up the work it is reporting on. But `upsertStep` is a `set`, so a
    // progress write that lands after the terminal one replaces a finished
    // step with a `running` snapshot and strips its `finishedAt`. Chaining
    // them gives a single handle the terminal path can settle first.
    let progressWrites: Promise<unknown> = Promise.resolve()
    const stepCtx: StepContext = {
      progress: (done, total) => {
        if (record.status !== 'running') {
          return
        }
        record.progress = { done, total }
        const snapshot = { ...record }
        progressWrites = progressWrites
          .then(() => persist.upsertStep(runId, snapshot))
          .catch(() => undefined)
        onStep?.(snapshot)
      },
    }
    try {
      const data = await fn(stepCtx)
      Object.assign(record, {
        status: 'ok',
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - t0,
      })
      await progressWrites
      await persist.upsertStep(runId, { ...record })
      onStep?.({ ...record })
      endSpan(span, ctx)
      return { data, step: record }
    } catch (err) {
      Object.assign(record, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - t0,
        error: { code: errorCode(err), message: errorMessage(err) },
      })
      await progressWrites
      await persist.upsertStep(runId, { ...record })
      onStep?.({ ...record })
      endSpan(span, {
        ...ctx,
        status: 'error',
        errorMessage: errorMessage(err),
      })
      log.warn('agent.step.failed', {
        ...ctx,
        stepId: record.id,
        error: record.error,
      })
      return { data: undefined, step: record }
    }
  }

  const tool = <T>(
    name: AgentToolName,
    fn: (ctx: StepContext) => Promise<T>,
    toolOpts: { retries?: number; nonCircuitErrorCodes?: string[] } = {}
  ) =>
    step(
      'tool',
      stepCtx =>
        withResilience(name, () => fn(stepCtx), {
          timeoutMs: Math.min(remainingMs(), budget.perToolTimeoutMs),
          retries: toolOpts.retries ?? 1,
          nonCircuitErrorCodes: toolOpts.nonCircuitErrorCodes,
        }),
      { tool: name }
    )

  try {
    const gameIds = run.input.gameIds
    const season = getCurrentSeason()
    await step('plan', async () => undefined, {
      notes:
        gameIds.length === 1
          ? 'Load game, gather team stats + book lines, draft, validate'
          : `Load ${gameIds.length} games, gather team stats + book lines for each, draft, validate`,
    })

    // Every id was checked against the schedule when the run was created, so a
    // miss here means the schedule moved underneath it.
    const { data: loadedGames } = await tool(
      'espn_game',
      () =>
        Promise.all(
          gameIds.map(id =>
            getGame(season, id).then(g => {
              if (!g) {
                throw new RunError('game_not_found', `Game ${id} not found`)
              }
              return g
            })
          )
        ),
      { nonCircuitErrorCodes: ['game_not_found'] }
    )
    if (!loadedGames) {
      throw new RunError('game_not_found', 'Could not load the selected games')
    }
    const games = loadedGames
    const closed = games.filter(g => g.status !== 'scheduled')
    if (closed.length > 0) {
      throw new RunError(
        'game_not_open',
        closed.length === games.length && games.length === 1
          ? `Game is ${closed[0].status.replace('_', ' ')}`
          : `${closed.map(g => `${g.away.abbrev} @ ${g.home.abbrev}`).join(', ')} ${closed.length === 1 ? 'has' : 'have'} already started`
      )
    }

    // A single-game run reports no progress at all: "1 of 1" is noise, and the
    // row has always rendered without it.
    const reportFor = (progress: (done: number, total: number) => void) =>
      games.length > 1 ? progress : undefined

    // One step per phase however many games there are — the timeline stays
    // eight rows (CONTRACT §9.3). Inside a phase the games run concurrently,
    // because they are independent and the sequential version alone can exceed
    // the whole run budget at six games.
    const [statsResult, oddsResult, pregameResult, epaResult] =
      await Promise.all([
        tool('espn_team_stats', ({ progress }) =>
          perGame(
            games,
            g =>
              Promise.all([
                getTeamStats(g.home.teamId, g.season),
                getTeamStats(g.away.teamId, g.season),
              ]),
            reportFor(progress)
          )
        ),
        // One Odds API credit for the whole run whatever the slate size: the
        // provider fetches every NFL game in a single cached request, and these
        // are reads of that one response.
        tool(
          'odds',
          ({ progress }) =>
            perGame(
              games,
              g => getOddsForGame(g, run.input.bookmaker),
              reportFor(progress)
            ),
          {
            retries: 0,
            nonCircuitErrorCodes: [
              'odds_not_found',
              'odds_no_bookmaker',
              'odds_not_configured',
            ],
          }
        ),
        tool('espn_pregame', ({ progress }) =>
          perGame(
            games,
            g => getPregameContext(g.gameId, g.home.teamId, g.away.teamId),
            reportFor(progress)
          )
        ),
        tool('nflverse_epa', ({ progress }) =>
          perGame(
            games,
            g => getTeamEpa(g.home.abbrev, g.away.abbrev, g.season),
            reportFor(progress)
          )
        ),
      ])

    const nulls = <T>(): (T | null)[] => games.map(() => null)
    const statsPairs = statsResult.data ?? nulls<[TeamStats, TeamStats]>()
    const oddsByGame: (OddsSnapshot | null)[] =
      oddsResult.data ?? nulls<OddsSnapshot>()
    const pregameByGame = pregameResult.data ?? nulls<PregameContext>()
    const epaByGame = epaResult.data ?? nulls<TeamEpaStats>()

    // Supplementary context only, and slate-wide, so a failure here shouldn't be
    // a tracked step or fail the run — worth less than the tool-wrapped calls.
    const leagueAverages = await getLeagueAverages(games[0].season).catch(
      () => null
    )

    const promptGames: PromptGame[] = games.map((game, i) => ({
      game,
      homeStats: statsPairs[i]?.[0] ?? null,
      awayStats: statsPairs[i]?.[1] ?? null,
      odds: oddsByGame[i],
      pregame: pregameByGame[i],
      epa: epaByGame[i],
    }))

    const client = getOpenAI()
    if (!client) {
      throw new RunError('ai_unavailable', 'OpenAI client not configured')
    }
    // A plan without player props can only build legs the book has posted, and
    // each game offers at most three markets. Asking for more legs than there
    // are markets guarantees a draft the validator rejects, so the count is
    // narrowed to what is actually available across the slate. Two anchored
    // legs beat a run that fails outright, and the user is not billed either
    // way unless the odds came back clean.
    const anchorableMarkets = oddsByGame.reduce(
      (total, odds) =>
        total +
        (odds
          ? [odds.spread, odds.total, odds.moneyline].filter(Boolean).length
          : 0),
      0
    )
    const legCount = run.input.playerProps
      ? run.input.legCount
      : Math.min(run.input.legCount, anchorableMarkets)

    if (legCount < 1) {
      throw new RunError(
        'no_anchorable_markets',
        games.length === 1
          ? 'No sportsbook has posted a line for this game yet, and this plan builds every leg from a posted line.'
          : 'No sportsbook has posted a line for any of these games yet, and this plan builds every leg from a posted line.'
      )
    }

    const constraints = { legCount, playerProps: run.input.playerProps }
    const prompt = buildParlayPrompt({
      games: promptGames,
      leagueAverages,
      riskLevel: run.input.riskLevel,
      ...constraints,
    })
    const draftStep = await step('draft', async () => {
      // Bounded by what's left of the budget, not just by `signal`. The budget
      // is otherwise only checked between steps, so an unbounded draft could
      // carry the run past the api function's own timeout and have the
      // instance killed before anything wrote a terminal status.
      const result = await draftParlay(client, prompt, {
        legCount,
        gameCount: games.length,
        timeoutMs: remainingMs(),
        signal,
        onPartial: onDraft
          ? preview => onDraft(preview as DraftPreview)
          : undefined,
      })
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
    await persist.upsertStep(runId, {
      ...draftStep.step,
      tokensInput,
      tokensOutput,
    })

    // A leg is priced by the book covering its own game, found the same way the
    // validator finds it: by the team it names.
    const gameForTeam = teamToGame(games)
    const oddsForGameId = new Map(
      games.map((game, i) => [game.gameId, oddsByGame[i]] as const)
    )
    const snappedLegs = draft.legs.map(leg => {
      const legGame = gameForTeam.get(leg.team)
      return legGame
        ? snapLegToBook(leg, legGame, oddsForGameId.get(legGame.gameId) ?? null)
        : // A team in none of the run's games. Left unanchored so it reaches
          // validateDraft, which is the one place that says why it is wrong.
          { ...leg, anchored: false }
    })
    // Each analysis block is resolved to its game before validation, so the
    // stored shape and the validated shape are the same one.
    const analysis = attachGameIds(draft.analysisSummary, games)

    let validationIssues: string[] = []
    const validation = await step('validate', async () => {
      validationIssues = validateDraft(
        { legs: snappedLegs, analysisSummary: analysis },
        games,
        // The same constraints the prompt was built from, so the model is never
        // judged against a shape it was not asked for.
        constraints
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
        validationSummary(validationIssues),
        validationIssues
      )
    }

    const result: AgentResult = {
      parlay: {
        legs: snappedLegs,
        combinedOdds: combineAmericanOdds(snappedLegs.map(l => l.odds)),
        parlayConfidence: Math.min(...snappedLegs.map(l => l.confidence)),
        gameSummary: analysis,
      },
      games: games.map((game, i) => {
        const homeStats = statsPairs[i]?.[0] ?? null
        const awayStats = statsPairs[i]?.[1] ?? null
        return {
          game,
          homeStats,
          awayStats,
          odds: oddsByGame[i],
          sources: {
            stats: homeStats && awayStats ? 'ok' : 'unavailable',
            odds: oddsByGame[i] ? 'ok' : 'unavailable',
            weather: game.weather
              ? 'ok'
              : game.venue?.indoor
                ? 'indoor'
                : 'unavailable',
          },
        }
      }),
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
