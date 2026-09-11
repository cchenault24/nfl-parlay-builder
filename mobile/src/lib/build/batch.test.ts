import { describe, expect, it, vi } from 'vitest'
import { runError } from '@shared/api/AgentRunService'
import type { Allowance } from '@shared/rateLimits'
import {
  batchCostLine,
  batchExceedsAllowance,
  batchGroups,
  runBatch,
  type BatchMode,
} from './batch'

describe('batchGroups', () => {
  it('makes one run per game in separate mode', () => {
    expect(batchGroups('separate', ['a', 'b', 'c'])).toEqual([['a'], ['b'], ['c']])
  })

  it('makes exactly one run in cross mode', () => {
    expect(batchGroups('cross', ['a', 'b', 'c'])).toEqual([['a', 'b', 'c']])
  })
})

describe('runBatch', () => {
  // Execution rides the SSE request (CONTRACT §0), so two at once means two
  // held-open connections. Sequential is the only shape the transport supports.
  it('never has two runs in flight at once', async () => {
    let inFlight = 0
    let peak = 0
    const run = vi.fn(async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await Promise.resolve()
      inFlight -= 1
    })

    await runBatch(batchGroups('separate', ['a', 'b', 'c']), run)

    expect(run).toHaveBeenCalledTimes(3)
    expect(peak).toBe(1)
  })

  it('runs the games in the order they were selected', async () => {
    const seen: string[] = []
    await runBatch(batchGroups('separate', ['a', 'b', 'c']), async ids => {
      seen.push(ids[0])
    })
    expect(seen).toEqual(['a', 'b', 'c'])
  })

  it('keeps going past a failure and leaves the other results intact', async () => {
    const outcome = await runBatch(batchGroups('separate', ['a', 'b', 'c']), async ids => {
      if (ids[0] === 'b') {
        throw new Error('The model had no edge over the book on one of its legs.')
      }
    })

    expect(outcome.succeeded).toEqual([['a'], ['c']])
    expect(outcome.failed).toEqual([
      {
        gameIds: ['b'],
        error: 'The model had no edge over the book on one of its legs.',
      },
    ])
    expect(outcome.skipped).toEqual([])
  })

  it('stops at a rate limit rather than firing the rest at it', async () => {
    const run = vi.fn(async (ids: string[]) => {
      if (ids[0] === 'b') {
        throw runError('rate_limited', 429, 'Too many runs.')
      }
    })

    const outcome = await runBatch(batchGroups('separate', ['a', 'b', 'c', 'd']), run)

    expect(run).toHaveBeenCalledTimes(2)
    expect(outcome.succeeded).toEqual([['a']])
    expect(outcome.stoppedBy).toBe('rate_limited')
    expect(outcome.skipped).toEqual([['b'], ['c'], ['d']])
  })

  // The weekly quota and an expired session refuse every remaining group the
  // same way; the batch used to fire them all and report N failures.
  it.each(['quota_exhausted', 'unauthorized'])('stops on %s as well', async code => {
    const run = vi.fn(async (ids: string[]) => {
      if (ids[0] === 'b') {
        throw runError(code, 403, 'Refused.')
      }
    })

    const outcome = await runBatch(batchGroups('separate', ['a', 'b', 'c']), run)

    expect(run).toHaveBeenCalledTimes(2)
    expect(outcome.stoppedBy).toBe(code)
    expect(outcome.skipped).toEqual([['b'], ['c']])
  })

  it('reports a cross-game run as one outcome', async () => {
    const outcome = await runBatch(batchGroups('cross', ['a', 'b']), async () => undefined)
    expect(outcome.succeeded).toEqual([['a', 'b']])
  })
})

describe('batchCostLine', () => {
  const allowance = (remaining: number, window: Allowance['window']): Allowance => ({
    remaining,
    window,
    resetsAt: '2026-10-12T00:00:00.000Z',
  })
  const line = (mode: BatchMode, gameCount: number, a: Allowance | null) =>
    batchCostLine({ mode, gameCount, allowance: a })

  it('names the daily allowance a Pro user is spending', () => {
    expect(line('separate', 3, allowance(7, 'day'))).toBe(
      'Uses 3 of your 7 remaining runs today. One cross-game parlay would use 1.'
    )
  })

  it('counts against the weekly quota on free', () => {
    expect(line('separate', 2, allowance(2, 'week'))).toBe(
      'Uses 2 of your 2 remaining runs this week. One cross-game parlay would use 1.'
    )
  })

  it('names the hourly window once that is what binds', () => {
    expect(line('separate', 1, allowance(4, 'hour'))).toBe(
      'Uses 1 of your 4 remaining runs this hour.'
    )
  })

  // The point of the whole line: a Pro user with four runs left is told before
  // selecting six games, not when run five is refused halfway through.
  it('refuses up front when the batch is larger than what is left', () => {
    expect(line('separate', 6, allowance(4, 'day'))).toBe(
      'Needs 6 runs; you have 4 left today. One cross-game parlay would use 1.'
    )
  })

  it('states a cross-game run as one run whatever the slate size', () => {
    expect(line('cross', 6, allowance(4, 'day'))).toBe(
      'Uses 1 of your 4 remaining runs today.'
    )
  })

  it('says nothing about cross-game when only one game is selected', () => {
    expect(line('separate', 1, null)).toBe('Uses 1 run.')
  })

  it('falls back to the bare cost before any allowance is known', () => {
    expect(line('separate', 3, null)).toBe(
      'Uses 3 runs. One cross-game parlay would use 1.'
    )
  })

  it('gets the singular right on the last remaining run', () => {
    expect(line('cross', 4, allowance(1, 'week'))).toBe(
      'Uses 1 of your 1 remaining run this week.'
    )
  })

  it('asks for a selection when there is none', () => {
    expect(line('separate', 0, allowance(2, 'week'))).toBe('Pick at least one game.')
  })
})

describe('batchExceedsAllowance', () => {
  const at = (remaining: number): Allowance => ({
    remaining,
    window: 'day',
    resetsAt: '2026-10-12T00:00:00.000Z',
  })

  it('is false while nothing is known', () => {
    expect(
      batchExceedsAllowance({ mode: 'separate', gameCount: 6, allowance: null })
    ).toBe(false)
  })

  it('is true when a separate batch is larger than what is left', () => {
    expect(
      batchExceedsAllowance({ mode: 'separate', gameCount: 3, allowance: at(2) })
    ).toBe(true)
  })

  it('is false for the same games as one cross-game run', () => {
    expect(batchExceedsAllowance({ mode: 'cross', gameCount: 3, allowance: at(2) })).toBe(
      false
    )
  })

  it('is true for anything at all once the allowance is spent', () => {
    expect(batchExceedsAllowance({ mode: 'cross', gameCount: 1, allowance: at(0) })).toBe(
      true
    )
  })
})
