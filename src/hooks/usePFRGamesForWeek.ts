import { useQuery } from '@tanstack/react-query'
import { API_CONFIG } from '../config/api'
import { Game } from '../types'

export const usePFRGamesForWeek = (week: number) => {
  return useQuery({
    queryKey: ['pfr-games-week', week],
    queryFn: async (): Promise<Game[]> => {
      const base = API_CONFIG.CLOUD_FUNCTIONS.baseURL
      const response = await fetch(
        `${base}${API_CONFIG.CLOUD_FUNCTIONS.endpoints.pfrGames}?week=${week}`
      )

      if (!response.ok) {
        throw new Error(
          `Failed to fetch PFR games for week ${week}: ${response.status} ${response.statusText}`
        )
      }

      const games: Game[] = await response.json()

      // Debug logging - Week-specific games
      console.info(
        `📅 [usePFRGamesForWeek] Loaded ${games.length} games for week ${week}:`,
        {
          week,
          gamesCount: games.length,
          games: games.map(game => ({
            gameId: game.gameId,
            homeTeam: game.home.name,
            awayTeam: game.away.name,
            dateTime: game.dateTime,
            status: game.status,
            venue: game.venue,
          })),
        }
      )

      return games
    },
    enabled: !!week && week > 0,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  })
}
