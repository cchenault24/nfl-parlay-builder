import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  makeGame,
  makeGameAnalysis,
  makeLeg,
  makeOdds,
  makeSecondGame,
  makeSecondGameAnalysis,
  makeTeamStats,
} from '../../testing/fixtures'
import {
  budgetForGames,
  type AgentResult,
  type AgentRun,
  type AgentStep,
} from '../shared/schemas'

const GAME = makeGame()
const OTHER = makeSecondGame()

// Every provider the orchestrator reaches for. Most are gated on a promise the
// test opens by hand, so it can inspect what has been *started* before anything
// resolves — the only way to assert concurrency without timing it.
const espn = vi.hoisted(() => ({
  getGame: vi.fn(),
  getTeamStats: vi.fn(),
  getPregameContext: vi.fn(),
  getLeagueAverages: vi.fn(),
}))
const nflverse = vi.hoisted(() => ({ getTeamEpa: vi.fn() }))
const odds = vi.hoisted(() => ({ getOddsForGame: vi.fn() }))
const ai = vi.hoisted(() => ({
  draftParlay: vi.fn(),
  getOpenAI: vi.fn(),
  buildParlayPrompt: vi.fn(() => 'prompt'),
  PARLAY_MODEL: 'test-model',
}))

vi.mock('../../providers/espn/client', () => espn)
vi.mock('../../providers/nflverse/client', () => nflverse)
vi.mock('../../providers/odds/client', () => odds)
vi.mock('../../service/ai', () => ai)

const { runAgent } = await import('./agent')

let started: string[]
let gate: Promise<void>
let openGate: () => void

function run(overrides: Partial<AgentRun['input']> = {}): AgentRun {
  return {
    id: 'run_1',
    userId: 'u1',
    createdAt: '2026-10-10T00:00:00.000Z',
    updatedAt: '2026-10-10T00:00:00.000Z',
    status: 'running',
    correlationId: 'c1',
    budget: { maxRunMs: 90_000, perToolTimeoutMs: 15_000 },
    input: {
      gameIds: [GAME.gameId],
      riskLevel: 'moderate',
      legCount: 3,
      playerProps: false,
      ...overrides,
    },
    tokensInput: 0,
    tokensOutput: 0,
  }
}

function persistSpy() {
  return {
    upsertStep: vi.fn(async () => undefined),
    getRun: vi.fn(async () => null),
    finishRun: vi.fn(async () => true),
  }
}

function finishedWith(
  persist: ReturnType<typeof persistSpy>
): Partial<AgentRun> {
  expect(persist.finishRun).toHaveBeenCalledTimes(1)
  return persist.finishRun.mock.calls[0][1] as Partial<AgentRun>
}

// Three legs: two markets in the first game, one in the second. Legal under the
// per-game market rule and illegal under the old draft-wide one.
function draftFor(gameCount: number) {
  const legs = [
    makeLeg({ betType: 'spread', team: 'Baltimore Ravens' }),
    makeLeg({
      betType: 'total',
      team: 'Baltimore Ravens',
      side: 'over',
      selection: 'Over 44.5',
      line: 44.5,
    }),
    makeLeg({
      betType: gameCount > 1 ? 'spread' : 'moneyline',
      team: gameCount > 1 ? 'Kansas City Chiefs' : 'Cincinnati Bengals',
      selection: gameCount > 1 ? 'Chiefs -2.5' : 'Bengals ML',
      line: gameCount > 1 ? -2.5 : null,
    }),
  ]
  // The model never emits a gameId; the orchestrator derives it.
  const games = [makeGameAnalysis(), makeSecondGameAnalysis()]
    .slice(0, gameCount)
    .map(({ gameId: _gameId, ...block }) => block)
  return {
    draft: { legs, analysisSummary: { games, slateSummary: null } },
    tokensInput: 100,
    tokensOutput: 200,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  started = []
  gate = new Promise<void>(resolve => {
    openGate = resolve
  })
  const gated = <T>(label: string, value: T) => {
    started.push(label)
    return gate.then(() => value)
  }

  espn.getGame.mockImplementation(async (_season: number, id: string) =>
    [GAME, OTHER].find(g => g.gameId === id)
  )
  espn.getTeamStats.mockImplementation((teamId: string) =>
    gated(`stats:${teamId}`, makeTeamStats({ teamId }))
  )
  espn.getPregameContext.mockImplementation((gameId: string) =>
    gated(`pregame:${gameId}`, null)
  )
  espn.getLeagueAverages.mockResolvedValue(null)
  nflverse.getTeamEpa.mockImplementation((home: string) =>
    gated(`epa:${home}`, null)
  )
  odds.getOddsForGame.mockImplementation((game: { gameId: string }) =>
    gated(`odds:${game.gameId}`, makeOdds())
  )
  ai.getOpenAI.mockReturnValue({})
  ai.draftParlay.mockImplementation(async () => draftFor(1))
})

describe('runAgent', () => {
  it('succeeds on a single game and returns a one-element games array', async () => {
    const persist = persistSpy()
    openGate()
    await runAgent(run(), persist)

    const updates = finishedWith(persist)
    expect(updates.status).toBe('succeeded')
    const result = updates.result as AgentResult
    expect(result.games).toHaveLength(1)
    expect(result.games[0].game.gameId).toBe(GAME.gameId)
    expect(result.games[0].sources).toEqual({
      stats: 'ok',
      odds: 'ok',
      weather: 'ok',
    })
    expect(result.parlay.gameSummary.games).toHaveLength(1)
    expect(result.parlay.gameSummary.games[0].gameId).toBe(GAME.gameId)
  })

  it('starts every game’s provider calls before any of them resolves', async () => {
    ai.draftParlay.mockImplementation(async () => draftFor(2))
    const persist = persistSpy()
    const pending = runAgent(
      run({ gameIds: [GAME.gameId, OTHER.gameId] }),
      persist
    )

    // Let the espn_game step settle, then the four tool phases dispatch.
    for (let i = 0; i < 40; i++) {
      await Promise.resolve()
    }

    // Four team-stat reads (two per game), plus one of each other call per game,
    // all in flight together. Sequential fan-out would show one game's worth.
    expect(started.filter(s => s.startsWith('stats:'))).toHaveLength(4)
    expect(started.filter(s => s.startsWith('odds:'))).toHaveLength(2)
    expect(started.filter(s => s.startsWith('pregame:'))).toHaveLength(2)
    expect(started.filter(s => s.startsWith('epa:'))).toHaveLength(2)

    openGate()
    await pending
    const updates = finishedWith(persist)
    expect(updates.status).toBe('succeeded')
    expect((updates.result as AgentResult).games).toHaveLength(2)
  })

  it('prices each leg from its own game’s book', async () => {
    ai.draftParlay.mockImplementation(async () => draftFor(2))
    odds.getOddsForGame.mockImplementation(async (game: { gameId: string }) =>
      game.gameId === GAME.gameId
        ? makeOdds()
        : makeOdds({ spread: { line: -2.5, homePrice: -130, awayPrice: 105 } })
    )
    const persist = persistSpy()
    openGate()
    await runAgent(run({ gameIds: [GAME.gameId, OTHER.gameId] }), persist)

    const legs = (finishedWith(persist).result as AgentResult).parlay.legs
    // Chiefs are the away side of the second game, so they take its away price.
    expect(legs.find(l => l.team === 'Kansas City Chiefs')).toMatchObject({
      anchored: true,
      odds: 105,
      line: 2.5,
    })
    expect(
      legs.find(l => l.betType === 'spread' && l.team === 'Baltimore Ravens')
    ).toMatchObject({ anchored: true, odds: -110, line: -3.5 })
  })

  it('keeps going when one game has no lines, and marks only that game', async () => {
    ai.draftParlay.mockImplementation(async () => draftFor(2))
    odds.getOddsForGame.mockImplementation(async (game: { gameId: string }) => {
      if (game.gameId === OTHER.gameId) {
        throw Object.assign(new Error('no lines'), { code: 'odds_not_found' })
      }
      return makeOdds()
    })
    const persist = persistSpy()
    openGate()
    await runAgent(run({ gameIds: [GAME.gameId, OTHER.gameId] }), persist)

    const updates = finishedWith(persist)
    expect(updates.status).toBe('succeeded')
    const result = updates.result as AgentResult
    expect(result.games.map(g => g.sources.odds)).toEqual(['ok', 'unavailable'])
    // The leg in the unpriced game keeps the model's own numbers.
    expect(
      result.parlay.legs.find(l => l.team === 'Kansas City Chiefs')?.anchored
    ).toBe(false)
  })

  it('fails the run when no game has any posted market', async () => {
    odds.getOddsForGame.mockRejectedValue(
      Object.assign(new Error('no lines'), { code: 'odds_not_found' })
    )
    const persist = persistSpy()
    openGate()
    await runAgent(run(), persist)

    const updates = finishedWith(persist)
    expect(updates.status).toBe('failed')
    expect(updates.error?.code).toBe('no_anchorable_markets')
  })

  it('refuses a game that has already started', async () => {
    espn.getGame.mockResolvedValue(makeGame({ status: 'in_progress' }))
    const persist = persistSpy()
    openGate()
    await runAgent(run(), persist)

    const updates = finishedWith(persist)
    expect(updates.status).toBe('failed')
    expect(updates.error?.code).toBe('game_not_open')
  })

  it('reports no step progress on a single-game run', async () => {
    const persist = persistSpy()
    openGate()
    await runAgent(run(), persist)

    const steps = persist.upsertStep.mock.calls.map(
      ([, step]) => step as AgentStep
    )
    expect(steps).not.toHaveLength(0)
    expect(steps.every(s => s.progress === undefined)).toBe(true)
  })

  it('counts games through a step on a multi-game run', async () => {
    ai.draftParlay.mockImplementation(async () => draftFor(2))
    const persist = persistSpy()
    openGate()
    await runAgent(run({ gameIds: [GAME.gameId, OTHER.gameId] }), persist)

    const statsProgress = persist.upsertStep.mock.calls
      .map(([, step]) => step as AgentStep)
      .filter(s => s.id === 'step_tool_espn_team_stats' && s.progress)
      .map(s => s.progress)
    expect(statsProgress).toContainEqual({ done: 1, total: 2 })
    expect(statsProgress).toContainEqual({ done: 2, total: 2 })

    // The eight conceptual rows are unchanged — six games must not become
    // forty-eight steps.
    const ids = new Set(
      persist.upsertStep.mock.calls.map(([, step]) => (step as AgentStep).id)
    )
    expect(ids.size).toBe(8)
  })

  it('never lets a progress write land after the step that finished', async () => {
    // `upsertStep` is a `set`, so a slow progress write that settles after the
    // terminal one puts a finished step back to `running` with no `finishedAt`.
    // Multi-game runs are the only ones that report progress, which is why
    // only they were leaving steps stuck mid-flight.
    const landed: AgentStep[] = []
    const inFlight: Promise<void>[] = []
    const persist = {
      upsertStep: vi.fn((_runId: string, step: AgentStep) => {
        const write = (async () => {
          if (step.progress) {
            await new Promise(resolve => setTimeout(resolve, 5))
          }
          landed.push(step)
        })()
        inFlight.push(write)
        return write
      }),
      getRun: vi.fn(async () => null),
      finishRun: vi.fn(async () => true),
    }
    ai.draftParlay.mockImplementation(async () => draftFor(2))
    openGate()
    await runAgent(run({ gameIds: [GAME.gameId, OTHER.gameId] }), persist)
    // A write the run never awaited is exactly the one that corrupts the
    // record, so settle everything before reading the order back.
    await Promise.all(inFlight)

    const lastPerStep = new Map<string, AgentStep>()
    for (const step of landed) {
      lastPerStep.set(step.id, step)
    }
    for (const step of lastPerStep.values()) {
      expect(step.status).not.toBe('running')
      expect(step.finishedAt).toBeDefined()
    }
  })

  it('forwards the draft as it is written, and only while it is', async () => {
    const seen: unknown[] = []
    ai.draftParlay.mockImplementation(
      async (
        _client: unknown,
        _prompt: string,
        opts: { onPartial?: (p: unknown) => void }
      ) => {
        opts.onPartial?.({ analysisSummary: { games: [{ matchupSummary: 'Cin' }] } })
        opts.onPartial?.({
          analysisSummary: { games: [{ matchupSummary: 'Cincinnati at home' }] },
        })
        return draftFor(1)
      }
    )
    const persist = persistSpy()
    openGate()
    await runAgent(run(), persist, { onDraft: preview => seen.push(preview) })

    expect(seen).toHaveLength(2)
    expect(seen[1]).toEqual({
      analysisSummary: { games: [{ matchupSummary: 'Cincinnati at home' }] },
    })
    // Previews are a live-stream nicety, not part of the record.
    const written = persist.upsertStep.mock.calls.map(([, step]) => step)
    expect(written.some(step => 'draft' in (step as object))).toBe(false)
  })

  it('does not ask the model to stream when no one is listening', async () => {
    const persist = persistSpy()
    openGate()
    await runAgent(run(), persist)

    const opts = ai.draftParlay.mock.calls[0][2] as { onPartial?: unknown }
    expect(opts.onPartial).toBeUndefined()
  })

  it('asks the model for a schema sized to the run', async () => {
    ai.draftParlay.mockImplementation(async () => draftFor(2))
    const persist = persistSpy()
    openGate()
    await runAgent(run({ gameIds: [GAME.gameId, OTHER.gameId] }), persist)

    expect(ai.draftParlay).toHaveBeenCalledWith(
      expect.anything(),
      'prompt',
      expect.objectContaining({ legCount: 3, gameCount: 2 })
    )
  })
})

describe('budgetForGames', () => {
  it('leaves a single-game run at exactly 90s', () => {
    expect(budgetForGames(1)).toBe(90_000)
  })

  it.each([
    [2, 110_000],
    [6, 190_000],
  ])('gives %d games %dms', (games, ms) => {
    expect(budgetForGames(games)).toBe(ms)
  })
})
