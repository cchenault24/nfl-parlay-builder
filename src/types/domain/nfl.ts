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
  team: {
    abbreviation: string
    displayName: string
    id: string
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
