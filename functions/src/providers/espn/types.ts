export type GameStatus = 'scheduled' | 'in_progress' | 'final' | 'postponed'

export interface TeamRef {
  teamId: string
  abbrev: string
  name: string
  record: string
  homeRecord: string
  roadRecord: string
}

export interface Venue {
  name: string
  city: string
  state: string
  indoor: boolean
}

export interface GameWeather {
  condition: string
  temperatureF: number
}

export interface ScheduleGame {
  gameId: string
  season: number
  week: number
  dateTime: string
  status: GameStatus
  neutralSite: boolean
  home: TeamRef
  away: TeamRef
  venue: Venue | null
  weather: GameWeather | null
  // Only meaningful once status is 'final' or 'in_progress'.
  homeScore: number | null
  awayScore: number | null
}

// A per-team box score, used only for grading saved parlays against a final
// result. `categories` is keyed by ESPN's own category name (passing,
// rushing, receiving, defensive, interceptions, kicking, ...); each athlete's
// `stats` is keyed by that category's own stat key names, verbatim as ESPN
// returns them (including "made/attempted"-style combined values).
export interface BoxScoreAthlete {
  id: string
  name: string
  stats: Record<string, string>
}

export interface TeamBoxScore {
  teamId: string
  categories: Record<string, BoxScoreAthlete[]>
}

export interface GameBoxScore {
  home: TeamBoxScore
  away: TeamBoxScore
}

export interface RankedStat {
  value: number
  rank: number
}

export interface TeamStats {
  teamId: string
  teamName: string
  season: number
  gamesPlayed: number
  offense: {
    totalYardsPerGame: RankedStat
    passingYardsPerGame: RankedStat
    rushingYardsPerGame: RankedStat
    pointsPerGame: RankedStat
  }
  defense: {
    yardsAllowedPerGame: RankedStat
    passingYardsAllowedPerGame: RankedStat
    rushingYardsAllowedPerGame: RankedStat
    pointsAllowedPerGame: RankedStat
    takeaways: RankedStat
  }
  overallOffenseRank: number
  overallDefenseRank: number
  overallRank: number
}
