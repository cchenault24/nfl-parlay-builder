import { beforeEach, describe, expect, it } from 'vitest'
import useParlayStore, {
  parlayKey,
  persistableEntries,
  type ParlayEntry,
} from './parlayStore'

const entry = (overrides: Partial<ParlayEntry> = {}): ParlayEntry => ({
  key: '5:g1',
  week: 5,
  gameIds: ['g1'],
  status: 'ready',
  steps: [],
  startedAt: 0,
  parlay: {} as ParlayEntry['parlay'],
  ...overrides,
})

const store = () => useParlayStore.getState()

beforeEach(() => {
  useParlayStore.setState({ entries: {} })
})

describe('parlayKey', () => {
  it('keys a single-game parlay on its one game', () => {
    expect(parlayKey(5, ['g1'])).toBe('5:g1')
  })

  // A cross-game parlay must never overwrite the single-game parlay for its
  // first game, which is why the whole set is in the key.
  it('keys a cross-game parlay on its whole set', () => {
    expect(parlayKey(5, ['g1', 'g2'])).toBe('5:g1+g2')
    expect(parlayKey(5, ['g1', 'g2'])).not.toBe(parlayKey(5, ['g1']))
  })

  it('is stable regardless of the order the games arrive in', () => {
    expect(parlayKey(5, ['g2', 'g1'])).toBe(parlayKey(5, ['g1', 'g2']))
  })

  it('separates the same games in different weeks', () => {
    expect(parlayKey(5, ['g1'])).not.toBe(parlayKey(6, ['g1']))
  })
})

describe('replaceEntries', () => {
  it('replaces the working set with what was loaded', () => {
    useParlayStore.setState({ entries: { '5:old': entry({ key: '5:old' }) } })

    store().replaceEntries({ '5:new': entry({ key: '5:new' }) })

    expect(Object.keys(store().entries)).toEqual(['5:new'])
  })

  // Re-hydration fires when the live week ticks over mid-session, which can
  // land while a run is streaming. Storage holds only finished parlays, so a
  // wholesale overwrite deleted the running entry — every later step, result and
  // failure then no-ops on a missing key, and the generation the server is about
  // to bill is unrecoverable.
  it('keeps a run that is still in flight', () => {
    useParlayStore.setState({
      entries: { '5:live': entry({ key: '5:live', status: 'running' }) },
    })

    store().replaceEntries({ '6:saved': entry({ key: '6:saved', week: 6 }) })

    expect(Object.keys(store().entries).sort()).toEqual(['5:live', '6:saved'])
    expect(store().entries['5:live'].status).toBe('running')
  })

  it('still drops finished entries that the load did not carry', () => {
    useParlayStore.setState({
      entries: {
        '5:done': entry({ key: '5:done' }),
        '5:failed': entry({ key: '5:failed', status: 'failed' }),
        '5:live': entry({ key: '5:live', status: 'running' }),
      },
    })

    store().replaceEntries({})

    expect(Object.keys(store().entries)).toEqual(['5:live'])
  })

  // The in-flight entry is the live one, so a stale stored copy under the same
  // key must not displace it.
  it('prefers the in-flight entry over a stored one with the same key', () => {
    useParlayStore.setState({
      entries: { '5:g1': entry({ status: 'running', startedAt: 999 }) },
    })

    store().replaceEntries({ '5:g1': entry({ status: 'ready', startedAt: 1 }) })

    expect(store().entries['5:g1'].status).toBe('running')
    expect(store().entries['5:g1'].startedAt).toBe(999)
  })

  it('clears everything when nothing is in flight', () => {
    useParlayStore.setState({ entries: { '5:g1': entry() } })

    store().replaceEntries({})

    expect(store().entries).toEqual({})
  })

  // A live run survives re-hydration, and its updates still land.
  it('leaves a preserved run writable', () => {
    useParlayStore.setState({
      entries: { '5:g1': entry({ status: 'running' }) },
    })
    store().replaceEntries({})

    store().failRun('5:g1', 'lost connection')

    expect(store().entries['5:g1'].status).toBe('failed')
    expect(store().entries['5:g1'].error).toBe('lost connection')
  })
})

describe('persistableEntries', () => {
  // Only finished parlays are written: a run mid-flight cannot be resumed, and
  // restoring it would show a spinner for a run nobody is driving.
  it('keeps only the finished ones', () => {
    const entries = {
      a: entry({ key: 'a' }),
      b: entry({ key: 'b', status: 'running' }),
      c: entry({ key: 'c', status: 'failed' }),
    }

    expect(Object.keys(persistableEntries(entries))).toEqual(['a'])
  })

  it('returns an empty set when nothing has finished', () => {
    expect(persistableEntries({ b: entry({ status: 'running' }) })).toEqual({})
  })
})
