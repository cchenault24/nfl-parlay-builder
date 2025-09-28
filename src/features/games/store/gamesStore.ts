import { create } from 'zustand'
import { NFLGame } from '../../../types'

interface GamesState {
  // Game data
  games: NFLGame[]
  selectedWeek: number | null
  currentWeek: number | null
  availableWeeks: number[]

  // Loading states
  isLoadingGames: boolean
  isLoadingWeek: boolean

  // Error states
  gamesError: string | null
  weekError: string | null

  // Actions
  setGames: (games: NFLGame[]) => void
  setSelectedWeek: (week: number) => void
  setCurrentWeek: (week: number) => void
  setAvailableWeeks: (weeks: number[]) => void
  setLoadingGames: (loading: boolean) => void
  setLoadingWeek: (loading: boolean) => void
  setGamesError: (error: string | null) => void
  setWeekError: (error: string | null) => void
  clearGamesData: () => void
}

export const useGamesStore = create<GamesState>(set => ({
  // Initial state
  games: [],
  selectedWeek: null,
  currentWeek: null,
  availableWeeks: [],
  isLoadingGames: false,
  isLoadingWeek: false,
  gamesError: null,
  weekError: null,

  // Actions
  setGames: games => set({ games }),
  setSelectedWeek: week => set({ selectedWeek: week }),
  setCurrentWeek: week => set({ currentWeek: week }),
  setAvailableWeeks: weeks => set({ availableWeeks: weeks }),
  setLoadingGames: loading => set({ isLoadingGames: loading }),
  setLoadingWeek: loading => set({ isLoadingWeek: loading }),
  setGamesError: error => set({ gamesError: error }),
  setWeekError: error => set({ weekError: error }),
  clearGamesData: () =>
    set({
      games: [],
      selectedWeek: null,
      gamesError: null,
      weekError: null,
    }),
}))
