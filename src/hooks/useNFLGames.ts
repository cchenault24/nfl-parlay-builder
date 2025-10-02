import { useQuery } from '@tanstack/react-query'
import { API_CONFIG } from '../config/api'
import { NFLGame } from '../types'

// V2 API response types (inline since they're specific to this hook)
interface V2Team {
  teamId: string
  name: string
  abbrev: string
  record?: string
}

interface V2Game {
  gameId: string
  week: number
  dateTime: string
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
  home: V2Team
  away: V2Team
}

interface V2CurrentWeekResponse {
  week: number
  season: number
}

// Transform v2 API response to match frontend expectations
function transformV2Games(v2Games: V2Game[]): NFLGame[] {
  return v2Games.map(game => {
    // Add safety checks for team data
    const homeTeam = game.home || {}
    const awayTeam = game.away || {}

    return {
      id: game.gameId,
      dateTime: game.dateTime,
      week: game.week,
      season: new Date(game.dateTime).getFullYear(),
      status: game.status,
      homeTeam: {
        id: homeTeam.teamId || '',
        name: homeTeam.name || 'Unknown Team',
        displayName: homeTeam.name || 'Unknown Team',
        abbreviation: homeTeam.abbrev || 'UNK',
        color: '000000',
        alternateColor: '000000',
        logo: '', // v2 doesn't include logos yet
      },
      awayTeam: {
        id: awayTeam.teamId || '',
        name: awayTeam.name || 'Unknown Team',
        displayName: awayTeam.name || 'Unknown Team',
        abbreviation: awayTeam.abbrev || 'UNK',
        color: '000000',
        alternateColor: '000000',
        logo: '', // v2 doesn't include logos yet
      },
    }
  })
}

export const useNFLGames = (week?: number) => {
  const query = useQuery({
    queryKey: ['nfl-games', week || 'current'],
    queryFn: async (): Promise<NFLGame[]> => {
      const base = API_CONFIG.CLOUD_FUNCTIONS.baseURL
      if (!week) {
        const currentWeekResponse = await fetch(
          `${base}${API_CONFIG.CLOUD_FUNCTIONS.endpoints.v2.currentWeek}`
        )
        if (!currentWeekResponse.ok) {
          throw new Error(
            `Failed to fetch current week: ${currentWeekResponse.status} ${currentWeekResponse.statusText}`
          )
        }
        const w: V2CurrentWeekResponse = await currentWeekResponse.json()

        const gamesResponse = await fetch(
          `${base}${API_CONFIG.CLOUD_FUNCTIONS.endpoints.v2.games(w.week)}`
        )
        if (!gamesResponse.ok) {
          throw new Error(
            `Failed to fetch games for week ${w.week}: ${gamesResponse.status} ${gamesResponse.statusText}`
          )
        }
        const games: V2Game[] = await gamesResponse.json()
        return transformV2Games(games)
      }
      const gamesResponse = await fetch(
        `${base}${API_CONFIG.CLOUD_FUNCTIONS.endpoints.v2.games(week)}`
      )
      if (!gamesResponse.ok) {
        throw new Error(
          `Failed to fetch games for week ${week}: ${gamesResponse.status} ${gamesResponse.statusText}`
        )
      }
      const games: V2Game[] = await gamesResponse.json()
      return transformV2Games(games)
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  return {
    data: query.data as NFLGame[] | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
