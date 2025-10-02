import { useQuery } from '@tanstack/react-query'
import { API_CONFIG } from '../config/api'

export interface V2TeamStatsOffense {
  totalYards: { rank: number; yardsPerGame: number }
  passingYards: { rank: number; yardsPerGame: number }
  rushingYards: { rank: number; yardsPerGame: number }
  pointsScored: { rank: number; pointsPerGame: number }
  thirdDownConversion: { rank: number; percentage: number }
  redZoneEfficiency: { rank: number; percentage: number }
}

export interface V2TeamStatsDefense {
  totalYardsAllowed: { rank: number; yardsPerGame: number }
  passingYardsAllowed: { rank: number; yardsPerGame: number }
  rushingYardsAllowed: { rank: number; yardsPerGame: number }
  pointsAllowed: { rank: number; pointsPerGame: number }
  turnovers: { rank: number; total: number }
  sacks: { rank: number; total: number }
}

export interface V2TeamStats {
  teamId: string
  teamName: string
  season: number
  week: number
  overallOffenseRank?: number
  overallDefenseRank?: number
  overallTeamRank?: number
  specialTeamsRank?: number | null
  offensiveRankings: V2TeamStatsOffense
  defensiveRankings: V2TeamStatsDefense
}

export interface V2Team {
  teamId: string
  name: string
  abbrev: string
  record: string
  overallRecord: string
  homeRecord: string
  roadRecord: string
  stats: V2TeamStats | null
}

export interface V2Leaders {
  passing?: { name: string; stats: string; value: number }
  rushing?: { name: string; stats: string; value: number }
  receiving?: { name: string; stats: string; value: number }
}

export interface V2Game {
  gameId: string
  week: number
  dateTime: string
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
  home: V2Team
  away: V2Team
  venue: { name: string; city: string; state: string }
  leaders?: V2Leaders
}

export const useNFLGameWeekWithStats = (week: number) => {
  return useQuery({
    queryKey: ['nfl-v2-games-with-stats', week],
    queryFn: async (): Promise<V2Game[]> => {
      const base = API_CONFIG.CLOUD_FUNCTIONS.baseURL
      const resp = await fetch(
        `${base}${API_CONFIG.CLOUD_FUNCTIONS.endpoints.v2.games(week)}`
      )
      if (!resp.ok) {
        throw new Error(
          `Failed to fetch games with stats for week ${week}: ${resp.status} ${resp.statusText}`
        )
      }
      return (await resp.json()) as V2Game[]
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: Number.isInteger(week) && week > 0,
  })
}
