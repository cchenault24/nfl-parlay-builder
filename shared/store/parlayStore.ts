import { create } from 'zustand'
import type {
  AgentStep,
  DataSources,
  Game,
  GeneratedParlay,
  OddsSnapshot,
  RiskLevel,
  TeamStats,
} from '../types'

interface ParlayStore {
  selectedGame: Game | null
  riskLevel: RiskLevel
  // Undefined means "no preference" — the server falls through its own book
  // priority. Only a plan that can choose ever sets it.
  bookmaker: string | undefined
  steps: AgentStep[]
  parlay: GeneratedParlay | null
  game: Game | null
  homeStats: TeamStats | null
  awayStats: TeamStats | null
  odds: OddsSnapshot | null
  sources: DataSources | null
  saveParlaySuccess: boolean
  saveParlayError: string

  setSelectedGame: (game: Game | null) => void
  setRiskLevel: (level: RiskLevel) => void
  setBookmaker: (key: string | undefined) => void
  upsertStep: (step: AgentStep) => void
  clearSteps: () => void
  setResult: (result: {
    parlay: GeneratedParlay
    game: Game
    homeStats: TeamStats | null
    awayStats: TeamStats | null
    odds: OddsSnapshot | null
    sources: DataSources
  }) => void
  clearResult: () => void
  setSaveParlaySuccess: (success: boolean) => void
  setSaveParlayError: (error: string) => void
}

const emptyResult = {
  parlay: null,
  game: null,
  homeStats: null,
  awayStats: null,
  odds: null,
  sources: null,
}

const useParlayStore = create<ParlayStore>(set => ({
  selectedGame: null,
  riskLevel: 'moderate',
  bookmaker: undefined,
  steps: [],
  ...emptyResult,
  saveParlaySuccess: false,
  saveParlayError: '',

  setSelectedGame: game => set({ selectedGame: game }),
  setRiskLevel: riskLevel => set({ riskLevel }),
  setBookmaker: bookmaker => set({ bookmaker }),
  upsertStep: step =>
    set(state => {
      const idx = state.steps.findIndex(s => s.id === step.id)
      if (idx === -1) {
        return { steps: [...state.steps, step] }
      }
      const steps = state.steps.slice()
      steps[idx] = step
      return { steps }
    }),
  clearSteps: () => set({ steps: [] }),
  setResult: result => set({ ...result }),
  clearResult: () =>
    set({ ...emptyResult, saveParlaySuccess: false, saveParlayError: '' }),
  setSaveParlaySuccess: saveParlaySuccess => set({ saveParlaySuccess }),
  setSaveParlayError: saveParlayError => set({ saveParlayError }),
}))

export default useParlayStore
