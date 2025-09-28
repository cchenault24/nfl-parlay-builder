// ================================================================================================
// PLAYER TYPES - Specific interfaces for player data structures
// ================================================================================================

export interface PlayerPosition {
  abbreviation: string
  displayName: string
}

export interface PlayerTeam {
  abbreviation: string
  displayName: string
  id: string
}

export interface BasePlayer {
  id: string
  displayName: string
  fullName?: string
  position?: string | PlayerPosition
  team?: string | PlayerTeam
  jerseyNumber?: string
  jersey?: string
  injuryStatus?: string
}

export interface NFLPlayer extends BasePlayer {
  position: PlayerPosition
  team: PlayerTeam
  jerseyNumber: string
  injuryStatus?: string
}

export interface RosterPlayer extends BasePlayer {
  position?: string | PlayerPosition
  team?: string | PlayerTeam
}

export interface PlayerStats {
  playerId: string
  season: number
  passingYards?: number
  passingTouchdowns?: number
  interceptions?: number
  rushingYards?: number
  rushingTouchdowns?: number
  receivingYards?: number
  receivingTouchdowns?: number
  receptions?: number
  fumbles?: number
  gamesPlayed?: number
  [key: string]: unknown // Allow for additional stats
}

export interface TeamStats {
  teamId: string
  season: number
  wins?: number
  losses?: number
  pointsFor?: number
  pointsAgainst?: number
  [key: string]: unknown // Allow for additional stats
}

export interface InjuryReport {
  playerId: string
  playerName: string
  status: 'probable' | 'questionable' | 'doubtful' | 'out'
  injury?: string
  practiceStatus?: string
  [key: string]: unknown // Allow for additional fields
}

export interface WeatherData {
  gameId: string
  temperature?: number
  condition?: string
  windSpeed?: number
  humidity?: number
  [key: string]: unknown // Allow for additional weather data
}
