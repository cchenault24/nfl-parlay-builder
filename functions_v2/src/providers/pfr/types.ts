export interface PFRGameItem {
  id: string
  dateTime: string
  homeTeam: {
    id: string
    name: string
    displayName: string
    abbreviation: string
    color: string
    alternateColor: string
    logo: string
  }
  awayTeam: {
    id: string
    name: string
    displayName: string
    abbreviation: string
    color: string
    alternateColor: string
    logo: string
  }
  week: number
  season: number | null
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
}

export interface PFRTeamStats {
  teamId: string
  teamName: string
  season: number
  week: number
  record: string
  overallRecord: string
  homeRecord: string
  roadRecord: string
  offenseRankings: {
    totalYardsRank: number
    passingYardsRank: number
    rushingYardsRank: number
    pointsScoredRank: number
  }
  defenseRankings: {
    totalYardsAllowedRank: number
    pointsAllowedRank: number
    turnoversRank: number
  }
  overallOffenseRank: number
  overallDefenseRank: number
  overallTeamRank: number
  specialTeamsRank?: number
}

export interface PFRScrapingResult {
  success: boolean
  season: number
  url?: string
  responseStatus?: number
  responseHeaders?: Record<string, unknown>
  responseSize?: number
  totalTables?: number
  teamTables?: number
  sampleData?: string[][]
  allTables?: Array<{
    id: string
    classList: string
    rowCount: number
  }>
  error?: string
}

export interface PFRTeamData {
  home: PFRTeamStats | null
  away: PFRTeamStats | null
}

export interface PFRTeamInput {
  teamId: string
  teamName: string
  pfrCode?: string
}

export interface PFRGameScheduleItem {
  day: string
  date: string
  time: string
  away: string
  home: string
}

export interface PFRWeekSchedule {
  [weekNumber: number]: PFRGameScheduleItem[]
}
