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
