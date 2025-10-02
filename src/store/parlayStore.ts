import { create } from 'zustand'
import { V2Game } from '../hooks/useNFLGameWeekWithStats'
import { GeneratedParlay } from '../types'

interface ParlayStore {
  // State
  parlay: GeneratedParlay | null
  selectedGame: V2Game | null
  saveParlaySuccess: boolean
  saveParlayError: string

  // Actions
  setParlay: (parlay: GeneratedParlay | null) => void
  setSelectedGame: (game: V2Game | null) => void
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
