import { useQuery } from '@tanstack/react-query'
import { useProviderContext } from '../../../contexts/ProviderContext'
import {
  createQueryOptions,
  QUERY_KEYS,
} from '../../../hooks/query/useQueryConfig'
import { NFLGame } from '../../../types'
import { useGamesStore } from '../store/gamesStore'

/**
 * Hook for fetching NFL games with provider abstraction
 */
export const useNFLGamesQuery = (week: number) => {
  const { setGames, setLoadingGames, setGamesError } = useGamesStore()
  const { getDataProvider } = useProviderContext()

  return useQuery({
    ...createQueryOptions<NFLGame[]>({
      queryKey: QUERY_KEYS.GAMES.BY_WEEK(week),
      staleTime: 10 * 60 * 1000, // 10 minutes for game data
      gcTime: 60 * 60 * 1000, // 1 hour cache
    }),
    queryFn: async (): Promise<NFLGame[]> => {
      setLoadingGames(true)
      setGamesError(null)

      try {
        const dataProvider = await getDataProvider()
        await dataProvider.getGamesByWeek(week)
        // For now, return empty array until we fix the transformation
        const games: NFLGame[] = []

        setGames(games)
        return games
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch games'
        setGamesError(errorMessage)
        throw error
      } finally {
        setLoadingGames(false)
      }
    },
    enabled: !!week && week > 0,
  })
}

/**
 * Hook for fetching current NFL week with provider abstraction
 */
export const useCurrentWeekQuery = () => {
  const { setCurrentWeek, setLoadingWeek, setWeekError } = useGamesStore()
  const { getDataProvider } = useProviderContext()

  return useQuery({
    ...createQueryOptions<number>({
      queryKey: QUERY_KEYS.GAMES.CURRENT_WEEK,
      staleTime: 60 * 60 * 1000, // 1 hour for current week
      gcTime: 24 * 60 * 60 * 1000, // 24 hours cache
      placeholderData: 1, // Provide fallback while loading
    }),
    queryFn: async (): Promise<number> => {
      setLoadingWeek(true)
      setWeekError(null)

      try {
        const dataProvider = await getDataProvider()
        await dataProvider.getCurrentWeek()
        // For now, return week 1 until we fix the transformation
        const currentWeek = 1

        setCurrentWeek(currentWeek)
        return currentWeek
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch current week'
        setWeekError(errorMessage)
        throw error
      } finally {
        setLoadingWeek(false)
      }
    },
  })
}

/**
 * Hook for fetching available weeks with provider abstraction
 */
export const useAvailableWeeksQuery = () => {
  const { setAvailableWeeks } = useGamesStore()
  const { getDataProvider } = useProviderContext()

  return useQuery({
    ...createQueryOptions<number[]>({
      queryKey: QUERY_KEYS.GAMES.AVAILABLE_WEEKS,
      staleTime: 24 * 60 * 60 * 1000, // 24 hours for available weeks
      gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days cache
    }),
    queryFn: async (): Promise<number[]> => {
      const dataProvider = await getDataProvider()
      await dataProvider.getAvailableWeeks()
      // For now, return weeks 1-18 until we fix the transformation
      const availableWeeks = Array.from({ length: 18 }, (_, i) => i + 1)

      setAvailableWeeks(availableWeeks)
      return availableWeeks
    },
  })
}

/**
 * Hook for fetching game rosters with provider abstraction
 */
export const useGameRostersQuery = (gameId?: string) => {
  const { getDataProvider } = useProviderContext()

  return useQuery({
    ...createQueryOptions<any>({
      queryKey: QUERY_KEYS.GAMES.ROSTERS(gameId || ''),
      staleTime: 5 * 60 * 1000, // 5 minutes for roster data
      gcTime: 30 * 60 * 1000, // 30 minutes cache
    }),
    queryFn: async (): Promise<any> => {
      if (!gameId) {
        throw new Error('Game ID is required')
      }

      const dataProvider = await getDataProvider()
      const response = await dataProvider.getTeamRoster(gameId)
      return response.data
    },
    enabled: !!gameId,
  })
}

/**
 * Hook for fetching team roster with provider abstraction
 */
export const useTeamRosterQuery = (teamId?: string) => {
  const { getDataProvider } = useProviderContext()

  return useQuery({
    ...createQueryOptions<any>({
      queryKey: QUERY_KEYS.GAMES.TEAM_ROSTER(teamId || ''),
      staleTime: 5 * 60 * 1000, // 5 minutes for roster data
      gcTime: 30 * 60 * 1000, // 30 minutes cache
    }),
    queryFn: async (): Promise<any> => {
      if (!teamId) {
        throw new Error('Team ID is required')
      }

      const dataProvider = await getDataProvider()
      return await dataProvider.getTeamRoster(teamId)
    },
    enabled: !!teamId,
  })
}
