export interface CurrentWeekResponse {
  week: number
}

export interface TeamStats {
  teamId: string
  teamName: string
  season: number
  week: number
  // Core offensive rankings - only what's needed for AI
  offenseRankings: {
    totalYardsRank: number
    passingYardsRank: number
    rushingYardsRank: number
    pointsScoredRank: number
  }
  // Core defensive rankings - only what's needed for AI
  defenseRankings: {
    totalYardsAllowedRank: number
    pointsAllowedRank: number
    turnoversRank: number
  }
  // Overall team strength rankings - useful for UI display
  overallOffenseRank?: number
  overallDefenseRank?: number
  overallTeamRank?: number
  specialTeamsRank?: number | null
}

export interface GamesResponse {
  gameId: string
  week: number
  dateTime: string
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
  home: {
    teamId: string
    name: string
    abbrev: string
    record: string
    overallRecord: string
    homeRecord: string
    roadRecord: string
    stats: TeamStats | null
  }
  away: {
    teamId: string
    name: string
    abbrev: string
    record: string
    overallRecord: string
    homeRecord: string
    roadRecord: string
    stats: TeamStats | null
  }
  venue: { name: string; city: string; state: string }
  weather?: { condition: string; temperatureF: number; windMph: number }
  leaders?: {
    passing?: { name: string; stats: string; value: number }
    rushing?: { name: string; stats: string; value: number }
    receiving?: { name: string; stats: string; value: number }
  }
}
