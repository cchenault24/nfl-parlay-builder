import { describe, expect, it, vi } from 'vitest'
import { runError } from '@shared/api/AgentRunService'
import {
  batchCostLine,
  batchExceedsQuota,
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

  it('reports a cross-game run as one outcome', async () => {
    const outcome = await runBatch(batchGroups('cross', ['a', 'b']), async () => undefined)
    expect(outcome.succeeded).toEqual([['a', 'b']])
  })
})

describe('batchCostLine', () => {
  const line = (mode: BatchMode, gameCount: number, quotaRemaining?: number | null) =>
    batchCostLine({ mode, gameCount, quotaRemaining })

  it('names the cheaper mode when several separate runs are selected', () => {
    expect(line('separate', 3, null)).toBe(
      'Uses 3 runs · one cross-game parlay would use 1.'
    )
  })

  it('says nothing about cross-game when only one game is selected', () => {
    expect(line('separate', 1, null)).toBe('Uses 1 run.')
  })

  it('states a cross-game run as one run', () => {
    expect(line('cross', 6, null)).toBe('Uses 1 run.')
  })

  it('counts against a weekly quota when the plan has one', () => {
    expect(line('separate', 2, 2)).toBe('Uses 2 of your 2 remaining runs this week.')
    expect(line('separate', 1, 1)).toBe('Uses 1 of your 1 remaining run this week.')
  })

  it('says so plainly when the quota cannot cover the batch', () => {
    expect(line('separate', 4, 2)).toBe('Needs 4 runs; you have 2 left this week.')
  })

  it('asks for a selection when there is none', () => {
    expect(line('separate', 0, 2)).toBe('Pick at least one game.')
  })
})

describe('batchExceedsQuota', () => {
  it('is false for an unlimited plan', () => {
    expect(batchExceedsQuota({ mode: 'separate', gameCount: 6, quotaRemaining: null })).toBe(
      false
    )
  })

  it('is true when a separate batch is larger than what is left', () => {
    expect(batchExceedsQuota({ mode: 'separate', gameCount: 3, quotaRemaining: 2 })).toBe(
      true
    )
  })

  it('is false for the same games as one cross-game run', () => {
    expect(batchExceedsQuota({ mode: 'cross', gameCount: 3, quotaRemaining: 2 })).toBe(false)
  })
})
