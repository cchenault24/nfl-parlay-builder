import { NFLGame } from '../../../types'
import {
  createArrayActions,
  createResetAction,
  createSimpleStore,
} from '../../../utils'

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
}

interface GamesActions {
  // Data actions
  setGames: (games: NFLGame[]) => void
  setSelectedWeek: (week: number) => void
  setCurrentWeek: (week: number) => void
  setAvailableWeeks: (weeks: number[]) => void

  // Loading actions
  setLoadingGames: (loading: boolean) => void
  setLoadingWeek: (loading: boolean) => void

  // Error actions
  setGamesError: (error: string | null) => void
  setWeekError: (error: string | null) => void

  // Array actions for games
  addGame: (game: NFLGame) => void
  removeGame: (index: number) => void
  updateGame: (index: number, game: NFLGame) => void
  clearGames: () => void

  // Reset actions
  clearGamesData: () => void
}

const initialState: GamesState = {
  games: [],
  selectedWeek: null,
  currentWeek: null,
  availableWeeks: [],
  isLoadingGames: false,
  isLoadingWeek: false,
  gamesError: null,
  weekError: null,
}

const arrayActions = createArrayActions<GamesState, 'games'>(
  'games',
  state => state.games
)

export const useGamesStore = createSimpleStore<GamesState & GamesActions>(
  initialState,
  set => ({
    // Data actions
    setGames: games => set({ games }),
    setSelectedWeek: week => set({ selectedWeek: week }),
    setCurrentWeek: week => set({ currentWeek: week }),
    setAvailableWeeks: weeks => set({ availableWeeks: weeks }),

    // Loading actions
    setLoadingGames: loading => set({ isLoadingGames: loading }),
    setLoadingWeek: loading => set({ isLoadingWeek: loading }),

    // Error actions
    setGamesError: error => set({ gamesError: error }),
    setWeekError: error => set({ weekError: error }),

    // Array actions for games
    addGame: game => set(arrayActions.addGame(game)),
    removeGame: index => set(arrayActions.removeGame(index)),
    updateGame: (index, game) => set(arrayActions.updateItem(index, game)),
    clearGames: () => set(arrayActions.clearArray()),

    // Reset actions
    clearGamesData: createResetAction({
      games: [],
      selectedWeek: null,
      gamesError: null,
      weekError: null,
    }),
  })
)
