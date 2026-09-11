import { create } from 'zustand'
import type {
  AgentGameResult,
  AgentStep,
  Game,
  GeneratedParlay,
  RiskLevel,
} from '../types'

// One entry per run the user has started this week, keyed by the games it
// covers. Switching games used to destroy the previous parlay, which on a free
// plan meant losing one of two generations for the week — so the working set is
// kept rather than replaced.
export type ParlayEntryStatus = 'running' | 'ready' | 'failed'

export interface ParlayEntry {
  key: string
  week: number
  gameIds: string[]
  status: ParlayEntryStatus
  // Per entry, not global: a batch runs several of these and each row reports
  // its own step.
  steps: AgentStep[]
  startedAt: number
  parlay?: GeneratedParlay
  games?: AgentGameResult[]
  error?: string
}

// `${week}:${sorted game ids}`. A single-game parlay keys on its one game, so
// the Build list can look a row up directly; a cross-game parlay keys on its
// whole set, so it can never overwrite the single-game parlay for its first
// game.
export function parlayKey(week: number, gameIds: string[]): string {
  return `${week}:${[...gameIds].sort().join('+')}`
}

interface ParlayStore {
  selectedGame: Game | null
  // The week being browsed, which is not always the live one — the picker
  // offers future weeks. Every screen in the Build stack keys off this, so a
  // pushed screen resolves the same games and the same entries as the list it
  // came from.
  activeWeek: number | null
  riskLevel: RiskLevel
  // Undefined means "whatever this tier defaults to" — the server owns that
  // number and the client never guesses it.
  legCount: number | undefined
  // Undefined means "no preference" — the server falls through its own book
  // priority. Only a plan that can choose ever sets it.
  bookmaker: string | undefined
  entries: Record<string, ParlayEntry>
  saveParlaySuccess: boolean
  saveParlayError: string

  setSelectedGame: (game: Game | null) => void
  setActiveWeek: (week: number | null) => void
  setRiskLevel: (level: RiskLevel) => void
  setLegCount: (count: number | undefined) => void
  setBookmaker: (key: string | undefined) => void

  startRun: (week: number, gameIds: string[]) => string
  upsertStep: (key: string, step: AgentStep) => void
  setResult: (
    key: string,
    result: { parlay: GeneratedParlay; games: AgentGameResult[] }
  ) => void
  failRun: (key: string, error: string) => void
  clearRun: (key: string) => void
  // Drops everything from before `week`. Called on hydrate against the *live*
  // week, not the browsed one: a week whose games have kicked off has been
  // superseded, but a future week the user was looking at has not.
  pruneBefore: (week: number) => void
  replaceEntries: (entries: Record<string, ParlayEntry>) => void

  setSaveParlaySuccess: (success: boolean) => void
  setSaveParlayError: (error: string) => void
}

const useParlayStore = create<ParlayStore>(set => ({
  selectedGame: null,
  activeWeek: null,
  riskLevel: 'moderate',
  legCount: undefined,
  bookmaker: undefined,
  entries: {},
  saveParlaySuccess: false,
  saveParlayError: '',

  setSelectedGame: game => set({ selectedGame: game }),
  setActiveWeek: activeWeek => set({ activeWeek }),
  setRiskLevel: riskLevel => set({ riskLevel }),
  setLegCount: legCount => set({ legCount }),
  setBookmaker: bookmaker => set({ bookmaker }),

  startRun: (week, gameIds) => {
    const key = parlayKey(week, gameIds)
    set(state => ({
      entries: {
        ...state.entries,
        [key]: {
          key,
          week,
          gameIds,
          status: 'running',
          steps: [],
          startedAt: Date.now(),
        },
      },
    }))
    return key
  },

  upsertStep: (key, step) =>
    set(state => {
      const entry = state.entries[key]
      if (!entry) {
        return state
      }
      const index = entry.steps.findIndex(s => s.id === step.id)
      const steps =
        index === -1
          ? [...entry.steps, step]
          : entry.steps.map((s, i) => (i === index ? step : s))
      return { entries: { ...state.entries, [key]: { ...entry, steps } } }
    }),

  setResult: (key, result) =>
    set(state => {
      const entry = state.entries[key]
      if (!entry) {
        return state
      }
      return {
        entries: {
          ...state.entries,
          [key]: { ...entry, status: 'ready', error: undefined, ...result },
        },
      }
    }),

  failRun: (key, error) =>
    set(state => {
      const entry = state.entries[key]
      if (!entry) {
        return state
      }
      return { entries: { ...state.entries, [key]: { ...entry, status: 'failed', error } } }
    }),

  clearRun: key =>
    set(state => {
      const { [key]: _removed, ...rest } = state.entries
      return { entries: rest }
    }),

  pruneBefore: week =>
    set(state => ({
      entries: Object.fromEntries(
        Object.entries(state.entries).filter(([, entry]) => entry.week >= week)
      ),
    })),

  // Loaded entries replace the working set, EXCEPT anything still in flight.
  //
  // Re-hydration happens when the live week ticks over mid-session, which can
  // land while a run is streaming. Storage holds only finished parlays by
  // design (`persistableEntries`), so a wholesale overwrite deleted the running
  // entry — `upsertStep`, `setResult` and `failRun` then all no-op on a missing
  // key, the screen reads "no longer in this week's working set", and the
  // generation the server is about to bill is unrecoverable.
  replaceEntries: entries =>
    set(state => ({
      entries: {
        ...entries,
        ...Object.fromEntries(
          Object.entries(state.entries).filter(
            ([, entry]) => entry.status === 'running'
          )
        ),
      },
    })),

  setSaveParlaySuccess: saveParlaySuccess => set({ saveParlaySuccess }),
  setSaveParlayError: saveParlayError => set({ saveParlayError }),
}))

export const selectEntry = (key: string | null) => (state: ParlayStore) =>
  key ? state.entries[key] : undefined

// Everything worth keeping across a relaunch: a finished parlay. A run that was
// still going, or that failed, is session state — it cannot be resumed, and
// restoring it would show a spinner for a run nobody is driving.
export function persistableEntries(
  entries: Record<string, ParlayEntry>
): Record<string, ParlayEntry> {
  return Object.fromEntries(
    Object.entries(entries).filter(([, entry]) => entry.status === 'ready')
  )
}

export const getParlayState = () => useParlayStore.getState()

export default useParlayStore
