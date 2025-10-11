import { create } from 'zustand'
import { Game, GeneratedParlay, GenerateParlayResponse } from '../types'

// Extended parlay type that includes gameData for UI consumption
type ExtendedParlay = GeneratedParlay & {
  gameData?: GenerateParlayResponse['gameData']
}

interface ParlayStore {
  // State
  parlay: ExtendedParlay | null
  selectedGame: Game | null
  saveParlaySuccess: boolean
  saveParlayError: string
  legCount: number

  // Actions
  setParlay: (parlay: ExtendedParlay | null) => void
  setSelectedGame: (game: Game | null) => void
  setSaveParlaySuccess: (success: boolean) => void
  setSaveParlayError: (error: string) => void
  setLegCount: (legCount: number) => void
}

const useParlayStore = create<ParlayStore>(set => ({
  // Initial state
  parlay: null,
  selectedGame: null,
  saveParlaySuccess: false,
  saveParlayError: '',
  legCount: 3,

  // Action implementations
  setParlay: parlay => set({ parlay }),
  setSelectedGame: game => set({ selectedGame: game }),
  setSaveParlaySuccess: success => set({ saveParlaySuccess: success }),
  setSaveParlayError: error => set({ saveParlayError: error }),
  setLegCount: legCount => set({ legCount }),
}))

export default useParlayStore
