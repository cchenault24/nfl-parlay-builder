import { create } from 'zustand'
import { GeneratedParlay, NFLGame } from '../types'

interface ParlayStore {
  // State
  parlay: GeneratedParlay | null
  selectedGame: NFLGame | null
  saveParlaySuccess: boolean
  saveParlayError: string

  // Actions
  setParlay: (parlay: GeneratedParlay | null) => void
  setSelectedGame: (game: NFLGame | null) => void
  setSaveParlaySuccess: (success: boolean) => void
  setSaveParlayError: (error: string) => void
}

const useParlayStore = create<ParlayStore>(set => ({
  // Initial state
  parlay: null,
  selectedGame: null,
  saveParlaySuccess: false,
  saveParlayError: '',

  // Action implementations
  setParlay: parlay => set({ parlay }),
  setSelectedGame: game => set({ selectedGame: game }),
  setSaveParlaySuccess: success => set({ saveParlaySuccess: success }),
  setSaveParlayError: error => set({ saveParlayError: error }),
}))

export default useParlayStore
