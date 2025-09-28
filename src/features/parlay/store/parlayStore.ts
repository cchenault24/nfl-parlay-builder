import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GeneratedParlay, NFLGame } from '../../../types'

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

  // Actions
  setParlay: (parlay: GeneratedParlay | null) => void
  setSelectedGame: (game: NFLGame | null) => void
  setGenerating: (isGenerating: boolean) => void
  setGenerationError: (error: string | null) => void
  setSaveParlaySuccess: (success: boolean) => void
  setSaveParlayError: (error: string | null) => void
  setSelectedAIProvider: (provider: string | null) => void
  setSelectedDataProvider: (provider: string | null) => void
  resetParlay: () => void
}

export const useParlayStore = create<ParlayState>()(
  persist(
    set => ({
      // Initial state
      parlay: null,
      selectedGame: null,
      isGenerating: false,
      generationError: null,
      saveParlaySuccess: false,
      saveParlayError: null,
      selectedAIProvider: null,
      selectedDataProvider: null,

      // Actions
      setParlay: parlay => set({ parlay }),
      setSelectedGame: game => set({ selectedGame: game }),
      setGenerating: isGenerating => set({ isGenerating }),
      setGenerationError: error => set({ generationError: error }),
      setSaveParlaySuccess: success => set({ saveParlaySuccess: success }),
      setSaveParlayError: error => set({ saveParlayError: error }),
      setSelectedAIProvider: provider => set({ selectedAIProvider: provider }),
      setSelectedDataProvider: provider =>
        set({ selectedDataProvider: provider }),
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
      partialize: state => ({
        selectedAIProvider: state.selectedAIProvider,
        selectedDataProvider: state.selectedDataProvider,
      }),
    }
  )
)
