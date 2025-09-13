// ===== BET TYPES =====
export type BetType = 'spread' | 'total' | 'moneyline' | 'player_prop'

// ===== NFL TYPES =====
export interface NFLTeam {
  id: string
  name: string
  displayName: string
  abbreviation: string
  color: string
  alternateColor: string
  logo: string
}

export interface NFLGame {
  id: string
  date: string
  homeTeam: NFLTeam
  awayTeam: NFLTeam
  week: number
  season: number
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
}

export interface NFLPlayer {
  id: string
  name: string
  displayName: string
  position: string
  jerseyNumber: string
  experience: number
  college?: string
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

// ===== PARLAY TYPES =====
export interface ParlayLeg {
  id: string
  betType: BetType
  selection: string
  target: string
  reasoning: string
  confidence: number
  odds: string
}

export interface GameSummary {
  matchupAnalysis: string // Offensive vs defensive matchups (e.g., "Chiefs explosive offense vs Bills top-ranked pass defense")
  gameFlow:
    | 'high_scoring_shootout'
    | 'defensive_grind'
    | 'balanced_tempo'
    | 'potential_blowout'
  keyFactors: string[] // 3-5 key factors shaping the game
  prediction: string // Overall game prediction/expectation (2-3 sentences)
  confidence: number // 1-10 confidence in the summary analysis
}

export interface GeneratedParlay {
  id: string
  legs: [ParlayLeg, ParlayLeg, ParlayLeg]
  gameContext: string
  aiReasoning: string
  overallConfidence: number
  estimatedOdds: string
  createdAt: string
  savedAt?: any // Firestore Timestamp when saved to user's history
  gameSummary?: GameSummary
}

export interface ParlayRequest {
  gameId: string
  legCount: 3
}

// ===== AUTH TYPES =====
export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  createdAt: any // Firestore Timestamp
  savedParlays?: string[] // Array of parlay IDs
}

export interface SavedParlay extends GeneratedParlay {
  userId: string
  savedAt: any // Firestore Timestamp
}
