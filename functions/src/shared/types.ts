// functions/src/shared/types.ts

/**
 * The available bet types supported in the parlay builder.
 * (Server-side: keep the canonical set tight.)
 */
export type BetType = 'spread' | 'moneyline' | 'total' | 'player_prop'

/**
 * A single leg in a parlay bet.
 */
export interface ParlayLeg {
  id: string
  betType: 'spread' | 'total' | 'moneyline' | 'player_prop'
  selection: string
  target: string
  reasoning: string
  confidence: number
  odds: string
}
/**
 * Options passed into the AI model when generating a parlay.
 */
export interface ParlayOptions {
  gameId: string
  numLegs: number
  strategies?: string[]
}

/**
 * Optional high-level summary of how the game is expected to play out.
 * (Server-friendly; keep it simple)
 */
export interface GameSummary {
  matchup: string
  narrative: string
  edges?: string[]
}

/**
 * The generated parlay result from the AI model.
 */
export interface GeneratedParlay {
  gameId: string
  legs: ParlayLeg[]
  summary?: string // optional explanation / AI reasoning
  gameSummary?: GameSummary
}

/**
 * API response shape for the generateParlay function.
 */
export interface GenerateParlayResponse {
  success: boolean
  parlay?: GeneratedParlay
  error?: string
}

/**
 * ===== NFL domain types used by server data clients =====
 */
export type NFLGameStatus = 'scheduled' | 'in_progress' | 'final'

export interface NFLTeam {
  id: string
  abbreviation: string
  displayName: string
  location: string
  name: string
  color: string
  alternateColor: string
  logo: string
}

export interface NFLGame {
  id: string
  week: number
  date: string // ISO datetime
  startTime: string // ISO datetime (can mirror date)
  status: NFLGameStatus
  homeTeam: NFLTeam
  awayTeam: NFLTeam
  venue: string // e.g., "Lambeau Field, Green Bay, WI"
}

/**
 * Strongly-typed football positions (server-side)
 */
export type PositionAbbr =
  | 'QB'
  | 'RB'
  | 'WR'
  | 'TE'
  | 'FB'
  | 'OL'
  | 'LT'
  | 'LG'
  | 'C'
  | 'RG'
  | 'RT'
  | 'EDGE'
  | 'DL'
  | 'DE'
  | 'DT'
  | 'NT'
  | 'LB'
  | 'OLB'
  | 'MLB'
  | 'ILB'
  | 'CB'
  | 'S'
  | 'FS'
  | 'SS'
  | 'DB'
  | 'K'
  | 'P'
  | 'KR'
  | 'PR'
  | 'LS'

export interface Position {
  /** Short code like QB, RB, WR, etc. */
  abbreviation: PositionAbbr | (string & {})
  /** Optional human-friendly name, e.g., "Quarterback" */
  name?: string
  /** Optional role flags for convenience */
  offense?: boolean
  defense?: boolean
  specialTeams?: boolean
}

// ...then in NFLPlayer, change the position type:

export interface NFLPlayer {
  id: string
  fullName: string
  firstName?: string
  lastName?: string
  position?: Position
  jerseyNumber?: string
  teamId?: string
  status?: 'active' | 'inactive' | 'injured' | 'out'
}

export interface GameRosters {
  gameId: string
  home: NFLPlayer[]
  away: NFLPlayer[]
}
