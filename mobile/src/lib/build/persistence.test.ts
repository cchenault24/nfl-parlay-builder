import { beforeEach, describe, expect, it } from 'vitest'
import useParlayStore, {
  parlayKey,
  type ParlayEntry,
} from '@shared/store/parlayStore'
import type { AgentGameResult, GeneratedParlay } from '@shared/types'
import {
  loadEntries,
  parseEntries,
  PARLAY_STORAGE_KEY,
  saveEntries,
  serializeEntries,
  type EntryStorage,
} from './persistence'

function memoryStorage(initial: Record<string, string> = {}): EntryStorage & {
  values: Record<string, string>
} {
  const values = { ...initial }
  return {
    values,
    getItem: async key => values[key] ?? null,
    setItem: async (key, value) => {
      values[key] = value
    },
  }
}

function parlay(gameId: string, week = 5): GeneratedParlay {
  return {
    parlayId: `run_${gameId}`,
    gameId,
    gameIds: [gameId],
    gameContext: 'CIN @ BAL — Week 5',
    week,
    gameDateTime: '2026-10-11T17:00:00Z',
    legs: [],
    combinedOdds: 250,
    parlayConfidence: 0.6,
    gameSummary: { games: [], slateSummary: null },
    model: 'test-model',
  }
}

function readyEntry(gameId: string, week = 5): ParlayEntry {
  return {
    key: parlayKey(week, [gameId]),
    week,
    gameIds: [gameId],
    status: 'ready',
    steps: [],
    startedAt: 0,
    parlay: parlay(gameId, week),
    games: [] as AgentGameResult[],
  }
}

const reset = () => useParlayStore.setState({ entries: {} })

describe('parlayStore entries', () => {
  beforeEach(reset)

  it('round-trips a result under its game key', () => {
    const store = useParlayStore.getState()
    const key = store.startRun(5, ['g1'])
    store.setResult(key, { parlay: parlay('g1'), games: [] })

    const entry = useParlayStore.getState().entries[key]
    expect(key).toBe('5:g1')
    expect(entry.status).toBe('ready')
    expect(entry.parlay?.gameId).toBe('g1')
  })

  it('leaves game A alone when game B is built', () => {
    const store = useParlayStore.getState()
    const a = store.startRun(5, ['g1'])
    store.setResult(a, { parlay: parlay('g1'), games: [] })
    const b = store.startRun(5, ['g2'])
    store.setResult(b, { parlay: parlay('g2'), games: [] })

    const { entries } = useParlayStore.getState()
    expect(Object.keys(entries).sort()).toEqual(['5:g1', '5:g2'])
    expect(entries['5:g1'].parlay?.gameId).toBe('g1')
  })

  it('keys a cross-game parlay on its whole set, not its first game', () => {
    const store = useParlayStore.getState()
    const single = store.startRun(5, ['g1'])
    const cross = store.startRun(5, ['g1', 'g2'])
    expect(single).toBe('5:g1')
    expect(cross).toBe('5:g1+g2')
    expect(Object.keys(useParlayStore.getState().entries)).toHaveLength(2)
  })

  it('keys the same set the same way whatever order it is given in', () => {
    expect(parlayKey(5, ['g2', 'g1'])).toBe(parlayKey(5, ['g1', 'g2']))
  })

  it('drops earlier weeks on prune', () => {
    useParlayStore.setState({
      entries: {
        '4:g9': readyEntry('g9', 4),
        '5:g1': readyEntry('g1', 5),
      },
    })
    useParlayStore.getState().pruneToWeek(5)
    expect(Object.keys(useParlayStore.getState().entries)).toEqual(['5:g1'])
  })

  it('records a failure against the run that failed, and nothing else', () => {
    const store = useParlayStore.getState()
    const a = store.startRun(5, ['g1'])
    store.setResult(a, { parlay: parlay('g1'), games: [] })
    const b = store.startRun(5, ['g2'])
    store.failRun(b, 'The model had no edge over the book on one of its legs.')

    const { entries } = useParlayStore.getState()
    expect(entries['5:g1'].status).toBe('ready')
    expect(entries['5:g2']).toMatchObject({ status: 'failed' })
  })

  it('forgets a canceled run entirely', () => {
    const store = useParlayStore.getState()
    const key = store.startRun(5, ['g1'])
    store.clearRun(key)
    expect(useParlayStore.getState().entries[key]).toBeUndefined()
  })
})

describe('persistence', () => {
  beforeEach(reset)

  it('writes only finished parlays', () => {
    const raw = serializeEntries({
      '5:g1': readyEntry('g1'),
      '5:g2': { ...readyEntry('g2'), status: 'running', parlay: undefined },
      '5:g3': { ...readyEntry('g3'), status: 'failed', error: 'nope' },
    })
    expect(Object.keys(JSON.parse(raw))).toEqual(['5:g1'])
  })

  it('round-trips through storage', async () => {
    const storage = memoryStorage()
    await saveEntries(storage, { '5:g1': readyEntry('g1') })
    expect(await loadEntries(storage, 5)).toEqual({ '5:g1': readyEntry('g1') })
  })

  it('drops an earlier week on hydrate', async () => {
    const storage = memoryStorage()
    await saveEntries(storage, { '4:g9': readyEntry('g9', 4) })
    expect(await loadEntries(storage, 5)).toEqual({})
  })

  it.each([
    ['unparseable storage', '{not json'],
    ['an array', '[]'],
    ['null', 'null'],
  ])('treats %s as an empty week', (_label, raw) => {
    expect(parseEntries(raw, 5)).toEqual({})
  })

  it('ignores a stored entry that is missing its parlay', () => {
    const raw = JSON.stringify({
      '5:g1': { ...readyEntry('g1'), parlay: undefined },
    })
    expect(parseEntries(raw, 5)).toEqual({})
  })

  it('survives storage that throws', async () => {
    const broken: EntryStorage = {
      getItem: async () => {
        throw new Error('no disk')
      },
      setItem: async () => {
        throw new Error('no disk')
      },
    }
    await expect(saveEntries(broken, {})).resolves.toBeUndefined()
    expect(await loadEntries(broken, 5)).toEqual({})
  })

  it('stores under a versioned key', async () => {
    const storage = memoryStorage()
    await saveEntries(storage, {})
    expect(Object.keys(storage.values)).toEqual([PARLAY_STORAGE_KEY])
  })
})
