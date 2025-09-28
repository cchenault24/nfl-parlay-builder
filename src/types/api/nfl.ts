// ================================================================================================
// NFL API TYPES - Type definitions for NFL.com API responses
// ================================================================================================

/**
 * NFL API game data structure
 */
export interface NFLGameData {
  gameId: string
  week: number
  season: number
  homeTeam: NFLTeam
  awayTeam: NFLTeam
  gameTime: string
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
  score?: {
    home: number
    away: number
  }
}

/**
 * NFL API team data structure
 */
export interface NFLTeam {
  teamId: string
  name: string
  displayName: string
  abbreviation: string
  city: string
  conference: 'AFC' | 'NFC'
  division: string
  logo?: string
}

/**
 * NFL API player data structure
 */
export interface NFLPlayer {
  playerId: string
  name: string
  displayName: string
  position: string
  jerseyNumber: string
  teamId: string
  height?: string
  weight?: number
  age?: number
  college?: string
  experience?: number
}

/**
 * NFL API roster data structure
 */
export interface NFLRosterData {
  teamId: string
  season: number
  players: NFLPlayer[]
}

/**
 * NFL API scoreboard data structure
 */
export interface NFLScoreboardData {
  week: number
  season: number
  games: NFLGameData[]
}

/**
 * NFL API player stats structure
 */
export interface NFLPlayerStats {
  playerId: string
  season: number
  week?: number
  passing?: {
    attempts: number
    completions: number
    yards: number
    touchdowns: number
    interceptions: number
    rating: number
  }
  rushing?: {
    attempts: number
    yards: number
    touchdowns: number
    long: number
  }
  receiving?: {
    targets: number
    receptions: number
    yards: number
    touchdowns: number
    long: number
  }
  defense?: {
    tackles: number
    assists: number
    sacks: number
    interceptions: number
    passesDefended: number
  }
}

/**
 * NFL API team stats structure
 */
export interface NFLTeamStats {
  teamId: string
  season: number
  week?: number
  offense: {
    totalYards: number
    passingYards: number
    rushingYards: number
    points: number
    turnovers: number
  }
  defense: {
    totalYardsAllowed: number
    passingYardsAllowed: number
    rushingYardsAllowed: number
    pointsAllowed: number
    takeaways: number
  }
}

/**
 * NFL API injury report structure
 */
export interface NFLInjuryReport {
  playerId: string
  playerName: string
  teamId: string
  position: string
  injury: string
  status: 'probable' | 'questionable' | 'doubtful' | 'out'
  practiceStatus: 'full' | 'limited' | 'did_not_participate'
  lastUpdated: string
}

/**
 * NFL API weather data structure
 */
export interface NFLWeatherData {
  gameId: string
  temperature?: number
  condition: 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'wind'
  windSpeed?: number
  windDirection?: string
  humidity?: number
  precipitation?: number
}
