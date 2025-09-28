// ================================================================================================
// SPORTRADAR API TYPES - Type definitions for SportRadar API responses
// ================================================================================================

/**
 * SportRadar API game data structure
 */
export interface SportRadarGameData {
  id: string
  week: number
  season: number
  home: SportRadarTeam
  away: SportRadarTeam
  scheduled: string
  status: 'scheduled' | 'in_progress' | 'closed' | 'postponed'
  scoring?: {
    home: {
      points: number
      quarters: number[]
    }
    away: {
      points: number
      quarters: number[]
    }
  }
  weather?: SportRadarWeatherData
}

/**
 * SportRadar API team data structure
 */
export interface SportRadarTeam {
  id: string
  name: string
  market: string
  alias: string
  conference: 'AFC' | 'NFC'
  division: string
  logo?: string
}

/**
 * SportRadar API player data structure
 */
export interface SportRadarPlayer {
  id: string
  name: string
  position: string
  jersey: string
  team: {
    id: string
    name: string
    market: string
  }
  height?: string
  weight?: number
  age?: number
  college?: string
  experience?: number
}

/**
 * SportRadar API roster data structure
 */
export interface SportRadarRosterData {
  team: SportRadarTeam
  players: SportRadarPlayer[]
}

/**
 * SportRadar API schedule data structure
 */
export interface SportRadarScheduleData {
  week: number
  season: number
  games: SportRadarGameData[]
}

/**
 * SportRadar API player stats structure
 */
export interface SportRadarPlayerStats {
  player: SportRadarPlayer
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
    passes_defended: number
  }
}

/**
 * SportRadar API team stats structure
 */
export interface SportRadarTeamStats {
  team: SportRadarTeam
  season: number
  week?: number
  offense: {
    total_yards: number
    passing_yards: number
    rushing_yards: number
    points: number
    turnovers: number
  }
  defense: {
    total_yards_allowed: number
    passing_yards_allowed: number
    rushing_yards_allowed: number
    points_allowed: number
    takeaways: number
  }
}

/**
 * SportRadar API injury report structure
 */
export interface SportRadarInjuryReport {
  player: SportRadarPlayer
  injury: string
  status: 'probable' | 'questionable' | 'doubtful' | 'out'
  practice_status: 'full' | 'limited' | 'did_not_participate'
  last_updated: string
}

/**
 * SportRadar API weather data structure
 */
export interface SportRadarWeatherData {
  game_id: string
  temperature?: number
  condition: 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'wind'
  wind_speed?: number
  wind_direction?: string
  humidity?: number
  precipitation?: number
}
