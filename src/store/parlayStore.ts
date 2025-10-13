import { create } from 'zustand'
import { Game, GameData, GeneratedParlay } from '../types'
import { LoadingContext } from '../types/loading'

interface ToolResponses {
  weather?: {
    condition: string
    temperatureF: number
    windMph: number
  }
  odds?: {
    moneylineHome: number
    moneylineAway: number
    totalPoints: number
    spreadHome: number
  }
}

interface ParlayStore {
  // State
  parlay: GeneratedParlay | null
  gameData: GameData | null
  selectedGame: Game | null
  saveParlaySuccess: boolean
  saveParlayError: string
  loadingContext: LoadingContext
  toolResponses: ToolResponses | null

  // Actions
  setParlay: (parlay: GeneratedParlay | null) => void
  setGameData: (gameData: GameData | null) => void
  setSelectedGame: (game: Game | null) => void
  setSaveParlaySuccess: (success: boolean) => void
  setSaveParlayError: (error: string) => void
  setLoadingContext: (context: Partial<LoadingContext>) => void
  resetLoadingContext: () => void
  setToolResponses: (toolResponses: ToolResponses | null) => void
}

const useParlayStore = create<ParlayStore>(set => ({
  // Initial state
  parlay: null,
  gameData: null,
  selectedGame: null,
  saveParlaySuccess: false,
  saveParlayError: '',
  toolResponses: null,
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
  setGameData: gameData => set({ gameData }),
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
  setToolResponses: toolResponses => set({ toolResponses }),
}))

export default useParlayStore
