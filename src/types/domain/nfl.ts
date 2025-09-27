import { BaseEntity } from '../core/common'

// ------------------------------------------------------------------------------------------------
// NFL domain types (consolidating all NFL-related types)
// ------------------------------------------------------------------------------------------------

export interface NFLTeam {
  id: string
  name: string
  displayName: string
  shortDisplayName?: string
  abbreviation: string
  color: string
  alternateColor: string
  logo: string
}

export interface NFLPlayer {
  id: string
  name: string
  displayName: string
  fullName?: string
  shortName?: string
  position: {
    name: string
    abbreviation: string
  }
  jerseyNumber: string
  experience: {
    years: number
  }
  age?: number
  college?: string
  status?: {
    type: string
  }
}

export interface NFLGame extends BaseEntity {
  date: string
  homeTeam: NFLTeam
  awayTeam: NFLTeam
  week: number
  season: number
  seasonType?: number
  status: {
    type: {
      id?: string
      name: string
      state?: string
      completed?: boolean
    }
  }
}

export interface GameRosters {
  homeRoster: NFLPlayer[]
  awayRoster: NFLPlayer[]
}

export interface TeamStats {
  teamId: string
  passingYards: number
  rushingYards: number
  totalYards: number
  pointsPerGame: number
  pointsAllowed: number
  turnovers: number
  record: string
}

export interface PlayerStats {
  playerId: string
  name: string
  position: string
  teamId: string
  passingYards?: number
  rushingYards?: number
  receivingYards?: number
  touchdowns: number
  receptions?: number
}

export interface NewsItem {
  title: string
  description: string
  publishedDate: string
  url: string
  teamIds: string[]
}
