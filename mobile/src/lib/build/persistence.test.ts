import { beforeEach, describe, expect, it } from 'vitest'
import useParlayStore, {
  parlayKey,
  type ParlayEntry,
} from '@shared/store/parlayStore'
import type { AgentGameResult, GeneratedParlay } from '@shared/types'
import {
  loadEntries,
  parseEntries,
  parlayStorageKey,
  saveEntries,
  serializeEntries,
  type EntryStorage,
} from './persistence'

const UID = 'uid-1'

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
    expect(entry.parlay?.gameIds).toEqual(['g1'])
  })

  it('leaves game A alone when game B is built', () => {
    const store = useParlayStore.getState()
    const a = store.startRun(5, ['g1'])
    store.setResult(a, { parlay: parlay('g1'), games: [] })
    const b = store.startRun(5, ['g2'])
    store.setResult(b, { parlay: parlay('g2'), games: [] })

    const { entries } = useParlayStore.getState()
    expect(Object.keys(entries).sort()).toEqual(['5:g1', '5:g2'])
    expect(entries['5:g1'].parlay?.gameIds).toEqual(['g1'])
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

  it('drops finished weeks on prune but keeps weeks not yet played', () => {
    useParlayStore.setState({
      entries: {
        '4:g9': readyEntry('g9', 4),
        '5:g1': readyEntry('g1', 5),
        '6:g2': readyEntry('g2', 6),
      },
    })
    useParlayStore.getState().pruneBefore(5)
    expect(Object.keys(useParlayStore.getState().entries).sort()).toEqual([
      '5:g1',
      '6:g2',
    ])
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
    await saveEntries(storage, UID, { '5:g1': readyEntry('g1') })
    expect(await loadEntries(storage, UID, 5)).toEqual({ '5:g1': readyEntry('g1') })
  })

  it('drops a week that has already been played', async () => {
    const storage = memoryStorage()
    await saveEntries(storage, UID, { '4:g9': readyEntry('g9', 4) })
    expect(await loadEntries(storage, UID, 5)).toEqual({})
  })

  // Looking at next week's slate must not delete this week's parlays, which is
  // what pruning to the *browsed* week rather than the live one would do.
  it('keeps a week the user browsed ahead to', async () => {
    const storage = memoryStorage()
    await saveEntries(storage, UID, {
      '5:g1': readyEntry('g1', 5),
      '6:g2': readyEntry('g2', 6),
    })
    const loaded = await loadEntries(storage, UID, 5)
    expect(Object.keys(loaded ?? {}).sort()).toEqual(['5:g1', '6:g2'])
  })

  it('treats nothing stored as an empty week', () => {
    expect(parseEntries(null, 5)).toEqual({})
    expect(parseEntries('', 5)).toEqual({})
  })

  // Unreadable is not empty. Returning `{}` here would let the caller mirror
  // that back over the blob it failed to read, turning one bad read into a
  // week of parlays gone for good.
  it.each([
    ['unparseable storage', '{not json'],
    ['an array', '[]'],
    ['null', 'null'],
  ])('refuses to call %s an empty week', (_label, raw) => {
    expect(parseEntries(raw, 5)).toBeNull()
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
    await expect(saveEntries(broken, UID, {})).resolves.toBeUndefined()
    // Null, not `{}`: unreadable storage must not be mirrored back as empty.
    expect(await loadEntries(broken, UID, 5)).toBeNull()
  })

  it('stores under a versioned key', async () => {
    const storage = memoryStorage()
    await saveEntries(storage, UID, {})
    expect(Object.keys(storage.values)).toEqual([parlayStorageKey(UID)])
  })

  // The leak this closes: on a shared device, the next person to sign in
  // hydrated the previous one's parlays — their picks, odds and AI reasoning —
  // into their own Build list, and a deleted account's content stayed on the
  // device after the server had wiped it.
  it('does not hand one account the parlays of another', async () => {
    const storage = memoryStorage()
    await saveEntries(storage, 'uid-a', { '5:g1': readyEntry('g1') })

    expect(await loadEntries(storage, 'uid-b', 5)).toEqual({})
  })

  it('keeps each account’s own cache when both have used the device', async () => {
    const storage = memoryStorage()
    await saveEntries(storage, 'uid-a', { '5:g1': readyEntry('g1') })
    await saveEntries(storage, 'uid-b', { '5:g2': readyEntry('g2') })

    expect(await loadEntries(storage, 'uid-a', 5)).toEqual({ '5:g1': readyEntry('g1') })
    expect(await loadEntries(storage, 'uid-b', 5)).toEqual({ '5:g2': readyEntry('g2') })
  })

  it('gives each account a distinct key', () => {
    expect(parlayStorageKey('uid-a')).not.toBe(parlayStorageKey('uid-b'))
  })
})
