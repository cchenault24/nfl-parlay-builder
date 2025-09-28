import { GeneratedParlay, NFLGame } from '../../../types'
import { createFeatureStore, createSafeMigration } from '../../../utils'

interface ParlayState {
  // Parlay data
  parlay: GeneratedParlay | null
  selectedGame: NFLGame | null

  // Parlay generation state
  isGenerating: boolean
  generationError: string | null

  // Save state
  saveParlaySuccess: boolean
  saveParlayError: string | null

  // Provider selection
  selectedAIProvider: string | null
  selectedDataProvider: string | null
}

interface ParlayActions {
  // Data actions
  setParlay: (parlay: GeneratedParlay | null) => void
  setSelectedGame: (game: NFLGame | null) => void

  // Generation state actions
  setGenerating: (isGenerating: boolean) => void
  setGenerationError: (error: string | null) => void

  // Save state actions
  setSaveParlaySuccess: (success: boolean) => void
  setSaveParlayError: (error: string | null) => void

  // Provider selection actions
  setSelectedAIProvider: (provider: string | null) => void
  setSelectedDataProvider: (provider: string | null) => void

  // Reset actions
  resetParlay: () => void
}

const initialState: ParlayState = {
  parlay: null,
  selectedGame: null,
  isGenerating: false,
  generationError: null,
  saveParlaySuccess: false,
  saveParlayError: null,
  selectedAIProvider: null,
  selectedDataProvider: null,
}

export const useParlayStore = createFeatureStore<ParlayState, ParlayActions>(
  initialState,
  set => ({
    // Data actions
    setParlay: parlay => set({ parlay }),
    setSelectedGame: game => set({ selectedGame: game }),

    // Generation state actions
    setGenerating: isGenerating => set({ isGenerating }),
    setGenerationError: error => set({ generationError: error }),

    // Save state actions
    setSaveParlaySuccess: success => set({ saveParlaySuccess: success }),
    setSaveParlayError: error => set({ saveParlayError: error }),

    // Provider selection actions
    setSelectedAIProvider: provider => set({ selectedAIProvider: provider }),
    setSelectedDataProvider: provider =>
      set({ selectedDataProvider: provider }),

    // Reset actions
    resetParlay: () =>
      set({
        parlay: null,
        isGenerating: false,
        generationError: null,
        saveParlaySuccess: false,
        saveParlayError: null,
      }),
  }),
  {
    name: 'nfl-parlay-parlay-store',
    version: 1,
    partialize: state => ({
      selectedAIProvider: state.selectedAIProvider,
      selectedDataProvider: state.selectedDataProvider,
    }),
    migrate: createSafeMigration(initialState, 1) as (
      persistedState: unknown,
      version: number
    ) => ParlayState & ParlayActions,
  }
)
