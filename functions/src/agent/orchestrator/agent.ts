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

type Persist = {
  appendStep: (runId: string, step: AgentStep) => Promise<void>
  updateRun: (runId: string, updates: Partial<AgentRun>) => Promise<void>
}

export async function runAgent(
  run: AgentRun,
  persist: Persist
): Promise<AgentRun> {
  const startedAt = Date.now()
  let current = AgentRunSchema.parse(run)
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
      ).catch((e: any) => ({
        name: 'pfr_schedule',
        ok: false,
        durationMs: Date.now() - toolStepStart,
        error: {
          code: e?.code || 'error',
          message: String(e?.message || e),
          retriable: !!e?.retriable,
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
      ).catch((e: any) => ({
        name: 'pfr_team_stats',
        ok: false,
        durationMs: Date.now() - toolStepStart,
        error: {
          code: e?.code || 'error',
          message: String(e?.message || e),
          retriable: !!e?.retriable,
        },
      }))
    ),
    parallelLimit(() =>
      withResilience(
        'weather',
        async () => {
          const t0 = Date.now()
          const data = await fetchWeatherForGame(current.input.gameId)
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
      ).catch((e: any) => ({
        name: 'weather',
        ok: false,
        durationMs: Date.now() - toolStepStart,
        error: {
          code: e?.code || 'error',
          message: String(e?.message || e),
          retriable: !!e?.retriable,
        },
      }))
    ),
    parallelLimit(() =>
      withResilience(
        'odds',
        async () => {
          const t0 = Date.now()
          const data = await fetchOddsForGame(current.input.gameId)
          return { name: 'odds', ok: true, durationMs: Date.now() - t0, data }
        },
        {
          timeoutMs: Math.min(remainingMs(), budget.perToolTimeoutMs),
          retries: 0,
        }
      ).catch((e: any) => ({
        name: 'odds',
        ok: false,
        durationMs: Date.now() - toolStepStart,
        error: {
          code: e?.code || 'error',
          message: String(e?.message || e),
          retriable: !!e?.retriable,
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
  ensureWithinBudgetOrThrow()

  // Step: draft using existing single-shot prompt/model
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

  // Build minimal GameData from tools
  const [home, away, season, week] = (() => {
    const parts = current.input.gameId.split('-')
    return [
      parts[0],
      parts[1],
      parseInt(parts[2] || '2025'),
      parseInt(parts[3] || '1'),
    ]
  })()
  const schedule =
    (toolStep.tools?.find(t => t.name === 'pfr_schedule')?.data as any[]) || []
  const scheduleGame = schedule.find(g => g?.id === current.input.gameId)
  const teamStats = toolStep.tools?.find(t => t.name === 'pfr_team_stats')
    ?.data as any
  const weather = toolStep.tools?.find(t => t.name === 'weather')?.data as any
  const odds = toolStep.tools?.find(t => t.name === 'odds')?.data as any
  const gameData: GameData = {
    gameId: current.input.gameId,
    week: week,
    dateTime: scheduleGame?.dateTime || new Date().toISOString(),
    status: scheduleGame?.status || 'scheduled',
    home: {
      teamId: home,
      name: teamStats?.home?.teamName || home,
      abbrev: home,
      record: teamStats?.home?.record || '0-0',
      overallRecord: teamStats?.home?.overallRecord || '0-0',
      homeRecord: teamStats?.home?.homeRecord || '0-0',
      roadRecord: teamStats?.home?.roadRecord || '0-0',
      stats: teamStats?.home || null,
    },
    away: {
      teamId: away,
      name: teamStats?.away?.teamName || away,
      abbrev: away,
      record: teamStats?.away?.record || '0-0',
      overallRecord: teamStats?.away?.overallRecord || '0-0',
      homeRecord: teamStats?.away?.homeRecord || '0-0',
      roadRecord: teamStats?.away?.roadRecord || '0-0',
      stats: teamStats?.away || null,
    },
    venue: scheduleGame?.venue || { name: 'TBD', city: 'TBD', state: 'TBD' },
    weather: weather || undefined,
    leaders: {},
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
  const completion = await ai.chat.completions.create({
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
  ensureWithinBudgetOrThrow()

  // Step: validate strictly
  const validateStepStart = Date.now()
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
    return { ...current, status: 'failed' }
  }

  const finalized: AgentRun = {
    ...current,
    status: 'succeeded',
    updatedAt: new Date().toISOString(),
    result: parsed.data,
  }
  await persist.updateRun(current.id, {
    status: 'succeeded',
    result: parsed.data,
    updatedAt: finalized.updatedAt,
  })
  return finalized
}
