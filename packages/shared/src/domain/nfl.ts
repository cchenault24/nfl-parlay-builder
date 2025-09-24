export type VenueType = 'indoor' | 'outdoor'
export type Surface = 'turf' | 'grass' | 'hybrid'

export interface NFLTeam {
  id: string
  abbreviation: string
  displayName: string
  shortDisplayName: string
  color?: string
  alternateColor?: string
  logo?: string
}

export interface NFLGame {
  id: string
  season: number
  week: number
  date: string
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
  homeTeam: NFLTeam
  awayTeam: NFLTeam
  venue?: {
    id?: string
    name?: string
    type?: VenueType
    surface?: Surface
    city?: string
    state?: string
  }
}

export interface NFLPlayer {
  id: string
  fullName: string
  shortName?: string
  position?: { abbreviation?: string; displayName?: string }
  teamId?: string
  status?: 'active' | 'inactive' | 'questionable' | 'out'
}

export interface GameRosters {
  gameId: string
  home: NFLPlayer[]
  away: NFLPlayer[]
}

export interface InjuryReport {
  gameId: string
  updates: { playerId: string; status: string; description?: string }[]
}

export interface Weather {
  gameId: string
  venue?: {
    name?: string
    type?: VenueType
    surface?: Surface
    city?: string
    state?: string
  }
  conditions: {
    temperature: number
    humidity?: number
    windSpeed?: number
    windDirection?: string
    precipitation?: {
      type: 'none' | 'rain' | 'snow'
      probability: number
      amount?: number
    }
    visibility?: number
  }
}

export interface Trend {
  key: string
  value: unknown
}
export interface MarketLine {
  market: string
  line: number
  price?: number
}

export interface UnifiedGameData {
  game: NFLGame
  rosters: GameRosters
  injuries?: InjuryReport
  weather?: Weather
  trends?: Trend[]
  lines?: MarketLine[]
}
