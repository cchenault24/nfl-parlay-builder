import { log, timeIt } from '../../observability/logger'
import { inc, observe, setActiveRuns } from '../../observability/metrics'
import { endSpan, startSpan } from '../../observability/tracing'
import { fetchPFRSeasonSchedule } from '../../providers/pfr'
import { fetchPFRTeamDataForGame } from '../../providers/pfr/teamStatsScraper'
import { GameData } from '../../routes/public/schema'
import { buildParlayPrompt, getOpenAI } from '../../service/ai'
import {
  AIGenerateResponseStrictSchema,
  AgentBudget,
  AgentRun,
  AgentRunSchema,
  AgentStep,
  AgentToolResult,
} from '../shared/schemas'
import { parallelLimit, withResilience } from '../tools'
import { fetchOddsForGame } from '../tools/odds'
import { fetchWeatherForGame } from '../tools/weather'

// Import secrets
import { defineSecret } from 'firebase-functions/params'
const WEATHER_API_KEY = defineSecret('WEATHER_API_KEY')

type Persist = {
  appendStep: (runId: string, step: AgentStep) => Promise<void>
  updateRun: (runId: string, updates: Partial<AgentRun>) => Promise<void>
}

export async function runAgent(
  run: AgentRun,
  persist: Persist
): Promise<AgentRun> {
  const startedAt = Date.now()
  const current = AgentRunSchema.parse(run)
  setActiveRuns(1)
  inc('runs_started')
  const rootSpan = startSpan('agent.run', {
    correlationId: current.correlationId,
    runId: current.id,
    attrs: { userId: current.userId },
  })
  log.info('agent.run.start', {
    correlationId: current.correlationId,
    runId: current.id,
    userId: current.userId,
  })
  const budget: AgentBudget = current.budget

  function remainingMs() {
    return budget.maxRunMs - (Date.now() - startedAt)
  }

  function ensureWithinBudgetOrThrow() {
    if (remainingMs() <= 0) {
      throw Object.assign(new Error('budget_exceeded'), {
        code: 'budget_exceeded',
        message: 'Run exceeded max wall-clock budget',
      })
    }
  }

  // Step: plan (trivial initial plan)
  const planStep: AgentStep = {
    id: `step_${Math.random().toString(36).slice(2)}`,
    type: 'plan',
    startedAt: new Date().toISOString(),
    notes: 'Collect PFR game + stats; draft; validate;',
    tokensInput: 0,
    tokensOutput: 0,
  }
  await persist.appendStep(current.id, planStep)
  ensureWithinBudgetOrThrow()

  // Step: tools (PFR schedule + team stats in parallel)
  const toolStepStart = Date.now()
  const toolsSpan = startSpan('agent.tools', {
    parent: rootSpan.ctx,
    correlationId: current.correlationId,
    runId: current.id,
  })
  const toolResults: AgentToolResult[] = await Promise.all([
    parallelLimit(() =>
      withResilience(
        'pfr_schedule',
        async () => {
          const t0 = Date.now()
          const data = await fetchPFRSeasonSchedule()
          return {
            name: 'pfr_schedule',
            ok: true,
            durationMs: Date.now() - t0,
            data,
          }
        },
        {
          timeoutMs: Math.min(remainingMs(), budget.perToolTimeoutMs),
          retries: 1,
        }
      ).catch(e => ({
        name: 'pfr_schedule',
        ok: false,
        durationMs: Date.now() - toolStepStart,
        error: {
          code: (e as { code?: string }).code || 'error',
          message: e instanceof Error ? e.message : String(e),
          retriable: Boolean((e as { retriable?: boolean }).retriable),
        },
      }))
    ),
    parallelLimit(() =>
      withResilience(
        'pfr_team_stats',
        async () => {
          const t0 = Date.now()
          const [home, away, season, week] = (() => {
            const parts = current.input.gameId.split('-')
            return [
              parts[0],
              parts[1],
              parseInt(parts[2] || '2025'),
              parseInt(parts[3] || '1'),
            ]
          })()
          const data = await fetchPFRTeamDataForGame(home, away, season, week)
          return {
            name: 'pfr_team_stats',
            ok: true,
            durationMs: Date.now() - t0,
            data,
          }
        },
        {
          timeoutMs: Math.min(remainingMs(), budget.perToolTimeoutMs),
          retries: 1,
        }
      ).catch(e => ({
        name: 'pfr_team_stats',
        ok: false,
        durationMs: Date.now() - toolStepStart,
        error: {
          code: (e as { code?: string }).code || 'error',
          message: e instanceof Error ? e.message : String(e),
          retriable: Boolean((e as { retriable?: boolean }).retriable),
        },
      }))
    ),
    parallelLimit(() =>
      withResilience(
        'weather',
        async () => {
          const t0 = Date.now()
          const data = await fetchWeatherForGame(
            current.input.gameId,
            current.input.gameContext?.venue
              ? {
                  venue: current.input.gameContext.venue,
                  dateTime: current.input.gameContext.dateTime,
                }
              : undefined,
            WEATHER_API_KEY.value()
          )
          return {
            name: 'weather',
            ok: true,
            durationMs: Date.now() - t0,
            data,
          }
        },
        {
          timeoutMs: Math.min(remainingMs(), budget.perToolTimeoutMs),
          retries: 0,
        }
      ).catch(e => ({
        name: 'weather',
        ok: false,
        durationMs: Date.now() - toolStepStart,
        error: {
          code: (e as { code?: string }).code || 'error',
          message: e instanceof Error ? e.message : String(e),
          retriable: Boolean((e as { retriable?: boolean }).retriable),
        },
      }))
    ),
    parallelLimit(() =>
      withResilience(
        'odds',
        async () => {
          const t0 = Date.now()
          const data = await fetchOddsForGame(
            current.input.gameId,
            current.input.gameContext
              ? {
                  home: current.input.gameContext.home,
                  away: current.input.gameContext.away,
                  dateTime: current.input.gameContext.dateTime,
                }
              : undefined
          )
          return { name: 'odds', ok: true, durationMs: Date.now() - t0, data }
        },
        {
          timeoutMs: Math.min(remainingMs(), budget.perToolTimeoutMs),
          retries: 0,
        }
      ).catch(e => ({
        name: 'odds',
        ok: false,
        durationMs: Date.now() - toolStepStart,
        error: {
          code: (e as { code?: string }).code || 'error',
          message: e instanceof Error ? e.message : String(e),
          retriable: Boolean((e as { retriable?: boolean }).retriable),
        },
      }))
    ),
  ])

  const toolStep: AgentStep = {
    id: `step_${Math.random().toString(36).slice(2)}`,
    type: 'tool',
    startedAt: new Date(toolStepStart).toISOString(),
    finishedAt: new Date().toISOString(),
    tools: toolResults,
    tokensInput: 0,
    tokensOutput: 0,
  }
  await persist.appendStep(current.id, toolStep)
  observe('tool_duration_ms', Date.now() - toolStepStart)
  endSpan(toolsSpan, {
    correlationId: current.correlationId,
    runId: current.id,
  })
  ensureWithinBudgetOrThrow()

  // Step: agentic draft using current prompt/model
  const ai = getOpenAI()
  if (!ai) {
    await persist.updateRun(current.id, {
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error: {
        code: 'ai_unavailable',
        message: 'OpenAI client not configured',
      },
    })
    return { ...current, status: 'failed' }
  }

  // Build GameData using pre-loaded context or fallback to tools
  let gameData: GameData

  if (current.input.gameContext) {
    // Use pre-loaded game context (optimized path)
    const context = current.input.gameContext

    const teamStats = toolStep.tools?.find(t => t.name === 'pfr_team_stats')
      ?.data as
      | {
          home?: import('../../providers/pfr').PFRTeamStats | null
          away?: import('../../providers/pfr').PFRTeamStats | null
        }
      | undefined
    const weather = toolStep.tools?.find(t => t.name === 'weather')?.data as
      | { condition: string; temperatureF: number; windMph: number }
      | undefined

    gameData = {
      gameId: context.gameId,
      week: context.week,
      dateTime: context.dateTime,
      status: context.status,
      home: {
        teamId: context.home.teamId,
        name: context.home.name,
        abbrev: context.home.abbrev,
        record: teamStats?.home?.record || context.home.record || '',
        overallRecord:
          teamStats?.home?.overallRecord || context.home.overallRecord || '',
        homeRecord:
          teamStats?.home?.homeRecord || context.home.homeRecord || '',
        roadRecord:
          teamStats?.home?.roadRecord || context.home.roadRecord || '',
        stats: teamStats?.home ?? null,
      },
      away: {
        teamId: context.away.teamId,
        name: context.away.name,
        abbrev: context.away.abbrev,
        record: teamStats?.away?.record || context.away.record || '',
        overallRecord:
          teamStats?.away?.overallRecord || context.away.overallRecord || '',
        homeRecord:
          teamStats?.away?.homeRecord || context.away.homeRecord || '',
        roadRecord:
          teamStats?.away?.roadRecord || context.away.roadRecord || '',
        stats: teamStats?.away ?? null,
      },
      venue: context.venue || {
        name: '',
        city: '',
        state: '',
      },
      weather: weather || null,
      leaders: {},
    }
  } else {
    // Fallback to legacy tool-based approach
    const [home, away, _season, week] = (() => {
      const parts = current.input.gameId.split('-')
      return [
        parts[0],
        parts[1],
        parseInt(parts[2] || '2025'),
        parseInt(parts[3] || '1'),
      ]
    })()
    const schedule =
      (toolStep.tools?.find(t => t.name === 'pfr_schedule')?.data as Array<{
        id: string
        dateTime?: string
        status?: 'scheduled' | 'in_progress' | 'final' | 'postponed'
        venue?: { name: string; city: string; state: string }
      }>) || []
    const scheduleGame = schedule.find(g => g?.id === current.input.gameId)
    const teamStats = toolStep.tools?.find(t => t.name === 'pfr_team_stats')
      ?.data as
      | {
          home?: import('../../providers/pfr').PFRTeamStats | null
          away?: import('../../providers/pfr').PFRTeamStats | null
        }
      | undefined
    const weather = toolStep.tools?.find(t => t.name === 'weather')?.data as
      | { condition: string; temperatureF: number; windMph: number }
      | undefined

    gameData = {
      gameId: current.input.gameId,
      week,
      dateTime: scheduleGame?.dateTime || new Date().toISOString(),
      status: scheduleGame?.status ?? 'scheduled',
      home: {
        teamId: home,
        name: teamStats?.home?.teamName || home,
        abbrev: home,
        record: teamStats?.home?.record || '',
        overallRecord: teamStats?.home?.overallRecord || '',
        homeRecord: teamStats?.home?.homeRecord || '',
        roadRecord: teamStats?.home?.roadRecord || '',
        stats: teamStats?.home ?? null,
      },
      away: {
        teamId: away,
        name: teamStats?.away?.teamName || away,
        abbrev: away,
        record: teamStats?.away?.record || '',
        overallRecord: teamStats?.away?.overallRecord || '',
        homeRecord: teamStats?.away?.homeRecord || '',
        roadRecord: teamStats?.away?.roadRecord || '',
        stats: teamStats?.away ?? null,
      },
      venue:
        scheduleGame?.venue &&
        scheduleGame.venue.name?.trim() !== '' &&
        scheduleGame.venue.city?.trim() !== '' &&
        scheduleGame.venue.state?.trim() !== ''
          ? {
              name: scheduleGame.venue.name,
              city: scheduleGame.venue.city,
              state: scheduleGame.venue.state,
            }
          : undefined,
      weather: weather || null,
      leaders: {},
    }
  }

  const riskLevel = (
    current.input.riskLevel === 'low'
      ? 'conservative'
      : current.input.riskLevel === 'high'
        ? 'aggressive'
        : 'moderate'
  ) as 'conservative' | 'moderate' | 'aggressive'

  const prompt = buildParlayPrompt({
    gameData,
    riskLevel,
  })
  const draftStepStart = Date.now()
  const draftSpan = startSpan('agent.draft', {
    parent: rootSpan.ctx,
    correlationId: current.correlationId,
    runId: current.id,
  })
  const completionTimed = await timeIt(() =>
    ai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are an NFL betting assistant. Return STRICT JSON only. No prose. Use the provided constraints.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
    })
  )
  const completion = completionTimed.result

  const draftText = completion.choices?.[0]?.message?.content || ''
  const draftParsed = (() => {
    try {
      return JSON.parse(draftText)
    } catch {
      return null
    }
  })()

  const draftStep: AgentStep = {
    id: `step_${Math.random().toString(36).slice(2)}`,
    type: 'draft',
    startedAt: new Date(draftStepStart).toISOString(),
    finishedAt: new Date().toISOString(),
    tokensInput: (completion.usage?.prompt_tokens as number) || 0,
    tokensOutput: (completion.usage?.completion_tokens as number) || 0,
    notes: draftParsed ? 'draft parsed' : 'draft parse failed',
  }
  await persist.appendStep(current.id, draftStep)
  observe('step_duration_ms', completionTimed.ms)
  endSpan(draftSpan, {
    correlationId: current.correlationId,
    runId: current.id,
  })
  ensureWithinBudgetOrThrow()

  // Step: validate strictly
  const validateStepStart = Date.now()
  const validateSpan = startSpan('agent.validate', {
    parent: rootSpan.ctx,
    correlationId: current.correlationId,
    runId: current.id,
  })
  const parsed = AIGenerateResponseStrictSchema.safeParse(draftParsed)
  const validateStep: AgentStep = {
    id: `step_${Math.random().toString(36).slice(2)}`,
    type: 'validate',
    startedAt: new Date(validateStepStart).toISOString(),
    finishedAt: new Date().toISOString(),
    tokensInput: 0,
    tokensOutput: 0,
    notes: parsed.success ? 'ok' : 'failed',
  }
  await persist.appendStep(current.id, validateStep)
  endSpan(validateSpan, {
    correlationId: current.correlationId,
    runId: current.id,
    status: parsed.success ? 'ok' : 'error',
    errorMessage: parsed.success ? undefined : 'strict zod failed',
  })

  // Enforce maximum steps budget (current pipeline uses 4 steps)
  const stepsUsed = 4
  if (stepsUsed > budget.maxSteps) {
    await persist.updateRun(current.id, {
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error: { code: 'budget_exceeded', message: 'Exceeded max steps budget' },
    })
    return { ...current, status: 'failed' }
  }

  if (!parsed.success) {
    inc('runs_failed')
    log.warn('agent.run.validation_failed', {
      correlationId: current.correlationId,
      runId: current.id,
      error: { code: 'validation_error', message: 'strict zod failed' },
    })
    // Simple contradiction: prevent both over and under for same market
    // and ensure leg odds are within sane range (already checked per-leg)
    await persist.updateRun(current.id, {
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error: {
        code: 'validation_error',
        message: 'Draft failed strict validation',
        details: parsed.error.flatten(),
      },
    })
    setActiveRuns(-1)
    endSpan(rootSpan, {
      correlationId: current.correlationId,
      runId: current.id,
      status: 'error',
      errorMessage: 'validation_failed',
    })
    return { ...current, status: 'failed' }
  }

  // Extract tool responses for the result
  const weatherResult = toolStep.tools?.find(t => t.name === 'weather')
    ?.data as
    | { condition: string; temperatureF: number; windMph: number }
    | undefined
  const oddsResult = toolStep.tools?.find(t => t.name === 'odds')?.data as
    | {
        moneylineHome: number
        moneylineAway: number
        totalPoints: number
        spreadHome: number
      }
    | undefined

  // Create enhanced result with tool responses
  const enhancedResult = {
    parlay: parsed.data,
    gameData,
    toolResponses: {
      ...(weatherResult && { weather: weatherResult }),
      ...(oddsResult && { odds: oddsResult }),
    },
  }

  const finalized: AgentRun = {
    ...current,
    status: 'succeeded',
    updatedAt: new Date().toISOString(),
    result: enhancedResult,
  }
  await persist.updateRun(current.id, {
    status: 'succeeded',
    result: enhancedResult,
    updatedAt: finalized.updatedAt,
  })
  inc('runs_succeeded')
  observe('run_duration_ms', Date.now() - startedAt)
  log.info('agent.run.succeeded', {
    correlationId: current.correlationId,
    runId: current.id,
  })
  setActiveRuns(-1)
  endSpan(rootSpan, {
    correlationId: current.correlationId,
    runId: current.id,
    status: 'ok',
  })
  return finalized
}
