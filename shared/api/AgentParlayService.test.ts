import { beforeEach, describe, expect, it, vi } from 'vitest'

// This is the only place a *paid* generation can be lost to a transport
// hiccup: the server bills a run inside the transaction that marks it
// succeeded, so a stream that drops after that point must reconcile to the
// result rather than report a failure the user was charged for.

const createRun = vi.fn()
const getRun = vi.fn()
const cancelRun = vi.fn()
const streamRun = vi.fn()

type Event = { type: string; data: unknown }
let emit: (evt: Event) => void = () => {}
let close: () => void | Promise<void> = () => {}
const stop = vi.fn()

vi.mock('./AgentRunService', () => ({
  AgentRunService: class {
    createRun = (...args: unknown[]) => createRun(...args)
    getRun = (...args: unknown[]) => getRun(...args)
    cancelRun = (...args: unknown[]) => cancelRun(...args)
    streamRun = (
      runId: string,
      token: string,
      onEvent: (evt: Event) => void,
      onClose: () => void | Promise<void>
    ) => {
      streamRun(runId, token)
      emit = onEvent
      close = onClose
      return stop
    }
  },
}))

let idToken: string | null = 'token-1'
vi.mock('../runtime', () => ({
  sharedRuntime: () => ({ getIdToken: async () => idToken }),
}))

const { AgentParlayService, STREAM_DEADLINE_MS } = await import('./AgentParlayService')

const team = (abbrev: string, name: string) => ({
  teamId: abbrev.toLowerCase(),
  abbrev,
  name,
  record: '3-1',
  homeRecord: '2-0',
  roadRecord: '1-1',
})

const game = (gameId = 'g1') =>
  ({
    gameId,
    season: 2026,
    week: 5,
    dateTime: '2026-10-04T17:00:00.000Z',
    status: 'scheduled',
    neutralSite: false,
    home: team('HOM', 'Home'),
    away: team('AWY', 'Away'),
    venue: null,
    weather: null,
    homeScore: null,
    awayScore: null,
  }) as never

const agentResult = {
  parlay: { legs: [], combinedOdds: -110, parlayConfidence: 0.5, gameSummary: {} },
  games: [{ game: game(), sources: { stats: 'ok', odds: 'ok', weather: 'ok' } }],
  model: 'test-model',
}

const drain = () => new Promise(resolve => setTimeout(resolve, 0))

beforeEach(() => {
  vi.clearAllMocks()
  idToken = 'token-1'
  createRun.mockResolvedValue({ runId: 'run-1', rateLimit: undefined })
  getRun.mockResolvedValue({ status: 'running' })
  cancelRun.mockResolvedValue(undefined)
})

function generate(options: Record<string, unknown> = {}) {
  return new AgentParlayService().generateParlay([game()], {
    riskLevel: 'moderate',
    ...options,
  } as never)
}

describe('generateParlay preconditions', () => {
  it('refuses when there is no session', async () => {
    idToken = null

    await expect(generate()).rejects.toThrow(/signed in/)
    expect(createRun).not.toHaveBeenCalled()
  })

  it('refuses an empty slate', async () => {
    await expect(
      new AgentParlayService().generateParlay([], { riskLevel: 'moderate' } as never)
    ).rejects.toThrow(/at least one game/)
    expect(createRun).not.toHaveBeenCalled()
  })
})

describe('awaitResult — terminal events', () => {
  it('resolves on a final event', async () => {
    const pending = generate()
    await drain()
    emit({ type: 'final', data: agentResult })

    const result = await pending
    expect(result.runId).toBe('run-1')
    expect(result.serviceMode).toBe('agent')
    expect(stop).toHaveBeenCalled()
  })

  it('forwards steps to the caller', async () => {
    const onStep = vi.fn()
    const pending = generate({ onStep })
    await drain()
    emit({ type: 'step', data: { id: 'step_draft' } })
    emit({ type: 'final', data: agentResult })
    await pending

    expect(onStep).toHaveBeenCalledWith({ id: 'step_draft' })
  })

  it('rejects on an error event, preferring its message', async () => {
    const pending = generate()
    const rejected = expect(pending).rejects.toThrow('The odds provider is down')
    await drain()
    emit({ type: 'error', data: { code: 'odds_unavailable', message: 'The odds provider is down' } })

    await rejected
  })

  it('falls back to the error code when there is no message', async () => {
    const pending = generate()
    const rejected = expect(pending).rejects.toThrow('odds_unavailable')
    await drain()
    emit({ type: 'error', data: { code: 'odds_unavailable', message: '' } })

    await rejected
  })
})

describe('awaitResult — reconciling a dropped stream', () => {
  // The expensive case. The run succeeded and was billed; only the socket went
  // away. Reporting a failure here spends the user's generation and hides a
  // parlay that exists.
  it('resolves from the stored run when the stream drops after success', async () => {
    getRun.mockResolvedValue({ status: 'succeeded', result: agentResult })
    const pending = generate()
    await drain()
    await close()

    const result = await pending
    expect(result.runId).toBe('run-1')
  })

  it('rejects with the server’s own message when the run had failed', async () => {
    getRun.mockResolvedValue({
      status: 'failed',
      error: { code: 'agent_error', message: 'The draft could not be validated' },
    })
    const pending = generate()
    const rejected = expect(pending).rejects.toThrow('The draft could not be validated')
    await drain()
    await close()

    await rejected
  })

  it('rejects when the run was canceled elsewhere', async () => {
    getRun.mockResolvedValue({ status: 'canceled' })
    const pending = generate()
    const rejected = expect(pending).rejects.toThrow('Run canceled')
    await drain()
    await close()

    await rejected
  })

  // Still running means the client genuinely does not know the outcome, which
  // is the only case that should read as a lost connection.
  it('reports a lost connection only when the run is still in flight', async () => {
    getRun.mockResolvedValue({ status: 'running' })
    const pending = generate()
    const rejected = expect(pending).rejects.toThrow(/Lost connection/)
    await drain()
    await close()

    await rejected
  })

  it('rejects with the lookup failure when the run cannot be re-read', async () => {
    getRun.mockRejectedValue(new Error('api unreachable'))
    const pending = generate()
    const rejected = expect(pending).rejects.toThrow('api unreachable')
    await drain()
    await close()

    await rejected
  })

  it('ignores a close that arrives after the result already landed', async () => {
    const pending = generate()
    await drain()
    emit({ type: 'final', data: agentResult })
    await pending
    await close()

    expect(getRun).not.toHaveBeenCalled()
  })

  it('treats a succeeded run with no result as a lost connection', async () => {
    getRun.mockResolvedValue({ status: 'succeeded', result: undefined })
    const pending = generate()
    const rejected = expect(pending).rejects.toThrow(/Lost connection/)
    await drain()
    await close()

    await rejected
  })
})

describe('awaitResult — abort', () => {
  it('rejects as canceled and stops the stream', async () => {
    const controller = new AbortController()
    const pending = generate({ signal: controller.signal })
    const rejected = expect(pending).rejects.toThrow('Parlay generation canceled.')
    await drain()
    controller.abort()

    await rejected
    // Closing the stream is what actually stops the run server-side.
    expect(stop).toHaveBeenCalled()
  })

  it('also asks the server to cancel, for a run watched from elsewhere', async () => {
    const controller = new AbortController()
    const pending = generate({ signal: controller.signal })
    const rejected = expect(pending).rejects.toThrow('canceled')
    await drain()
    controller.abort()
    await rejected
    await drain()

    expect(cancelRun).toHaveBeenCalledWith('run-1', 'token-1')
  })

  // The Cancel button is on screen before the POST that creates the run has
  // returned. An abort in that window has no listener to fire; it must still
  // stop the run rather than let it execute, bill, and vanish.
  it('cancels a run whose creation finished after the abort', async () => {
    let finishCreate: (value: unknown) => void = () => {}
    createRun.mockReturnValue(new Promise(resolve => (finishCreate = resolve)))
    const controller = new AbortController()
    const pending = generate({ signal: controller.signal })
    const rejected = expect(pending).rejects.toThrow('Parlay generation canceled.')
    await drain()
    controller.abort()
    finishCreate({ runId: 'run-1', rateLimit: undefined })

    await rejected
    expect(streamRun).not.toHaveBeenCalled()
    expect(cancelRun).toHaveBeenCalledWith('run-1', 'token-1')
  })

  it('reconciles and cancels with a fresh token, not the one the run began with', async () => {
    getRun.mockResolvedValue({ status: 'succeeded', result: agentResult })
    const pending = generate()
    await drain()
    idToken = 'token-2'
    await close()

    await expect(pending).resolves.toMatchObject({ runId: 'run-1' })
    expect(getRun).toHaveBeenCalledWith('run-1', 'token-2')
  })

  // Best-effort: a cancel the server refuses must not replace the caller's
  // "canceled" with a network error.
  it('still reports a cancel when the backstop cancel call fails', async () => {
    cancelRun.mockRejectedValue(new Error('api unreachable'))
    const controller = new AbortController()
    const pending = generate({ signal: controller.signal })
    const rejected = expect(pending).rejects.toThrow('Parlay generation canceled.')
    await drain()
    controller.abort()

    await rejected
  })

  it('ignores an abort that arrives after the result', async () => {
    const controller = new AbortController()
    const pending = generate({ signal: controller.signal })
    await drain()
    emit({ type: 'final', data: agentResult })
    await pending
    controller.abort()

    expect(cancelRun).not.toHaveBeenCalled()
  })
})

describe('awaitResult — deadline', () => {
  it('gives up on a silent stream once the server could no longer be running it', async () => {
    vi.useFakeTimers()
    try {
      getRun.mockResolvedValue({ status: 'failed', error: { message: 'Run abandoned' } })
      const pending = generate()
      const rejected = expect(pending).rejects.toThrow('Run abandoned')
      await vi.advanceTimersByTimeAsync(STREAM_DEADLINE_MS)

      await rejected
      expect(stop).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('createRun', () => {
  it('passes the slate and settings through', async () => {
    const pending = generate({ bookmaker: 'fanduel', legCount: 4 })
    await drain()
    emit({ type: 'final', data: agentResult })
    await pending

    expect(createRun).toHaveBeenCalledWith({
      gameIds: ['g1'],
      riskLevel: 'moderate',
      bookmaker: 'fanduel',
      legCount: 4,
      token: 'token-1',
    })
  })

  it('carries the rate limit back when the server sent one', async () => {
    createRun.mockResolvedValue({
      runId: 'run-1',
      rateLimit: { remaining: 1, limit: 2 },
    })
    const pending = generate()
    await drain()
    emit({ type: 'final', data: agentResult })

    expect((await pending).rateLimit).toEqual({ remaining: 1, limit: 2 })
  })
})
