import { create } from 'zustand'
import { Game, GeneratedParlay, GenerateParlayResponse } from '../types'
import { LoadingContext } from '../types/loading'

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
  loadingContext: LoadingContext

  // Actions
  setParlay: (parlay: ExtendedParlay | null) => void
  setSelectedGame: (game: Game | null) => void
  setSaveParlaySuccess: (success: boolean) => void
  setSaveParlayError: (error: string) => void
  setLoadingContext: (context: Partial<LoadingContext>) => void
  resetLoadingContext: () => void
}

const useParlayStore = create<ParlayStore>(set => ({
  // Initial state
  parlay: null,
  selectedGame: null,
  saveParlaySuccess: false,
  saveParlayError: '',
  loadingContext: {
    isActive: false,
    currentPhase: '',
    progress: 0,
    isMockMode: false,
    elapsedTime: 0,
    estimatedTimeRemaining: 0,
  },

  // Action implementations
  setParlay: parlay => set({ parlay }),
  setSelectedGame: game => set({ selectedGame: game }),
  setSaveParlaySuccess: success => set({ saveParlaySuccess: success }),
  setSaveParlayError: error => set({ saveParlayError: error }),
  setLoadingContext: context =>
    set(state => ({
      loadingContext: { ...state.loadingContext, ...context },
    })),
  resetLoadingContext: () =>
    set({
      loadingContext: {
        isActive: false,
        currentPhase: '',
        progress: 0,
        isMockMode: false,
        elapsedTime: 0,
        estimatedTimeRemaining: 0,
      },
    }),
}))

export default useParlayStore
