import { useQuery } from '@tanstack/react-query'
import { container } from '../services/container'
import { GameRosters, NFLGame } from '../types'

/**
 * Fetch rosters for a specific game.
 *
 * The service method `nflData.gameRosters` expects an `NFLGame` and returns
 * `{ homeRoster, awayRoster }`. Our app-level `GameRosters` shape is
 * `{ gameId, home, away }` where `home`/`away` are arrays of `NFLPlayer`.
 */
export function useGameRosters(game?: NFLGame) {
  const enabled = Boolean(game?.id)

  return useQuery<GameRosters>({
    queryKey: ['gameRosters', game?.id],
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      if (!game) {
        throw new Error('useGameRosters called without a game')
      }

      // Service returns `{ homeRoster, awayRoster }` and takes an `NFLGame`.
      const { homeRoster, awayRoster } =
        await container.nflData.gameRosters(game)

      // Map to the app's `GameRosters` shape expected by callers.
      const mapped: GameRosters = {
        gameId: game.id,
        home: homeRoster,
        away: awayRoster,
      }

      return mapped
    },
  })
}
