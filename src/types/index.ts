import { Timestamp } from 'firebase/firestore'

// ===== SCHEDULE (mirrors functions/src/providers/espn/types.ts) =====
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

export interface Game {
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

// ===== ODDS (mirrors functions/src/providers/odds/client.ts) =====
export interface OddsSnapshot {
  eventId: string
  bookmaker: string
  bookmakerKey: string
  lastUpdate: string
  spread: { line: number; homePrice: number; awayPrice: number } | null
  total: { line: number; overPrice: number; underPrice: number } | null
  moneyline: { home: number; away: number } | null
}

// ===== PARLAY =====
export type BetType =
  | 'spread'
  | 'moneyline'
  | 'total'
  | 'team_total_points'
  | 'first_half_spread'
  | 'first_half_total'
  | 'player_passing_yards'
  | 'player_passing_attempts'
  | 'player_passing_completions'
  | 'player_passing_tds'
  | 'player_interceptions'
  | 'player_longest_completion'
  | 'player_rushing_yards'
  | 'player_rushing_attempts'
  | 'player_rushing_tds'
  | 'player_longest_rush'
  | 'player_receiving_yards'
  | 'player_receptions'
  | 'player_receiving_tds'
  | 'player_longest_reception'
  | 'player_rush_rec_yards'
  | 'player_anytime_td'
  | 'player_first_td'
  | 'team_total_tds'
  | 'field_goals_made'
  | 'kicking_points'
  | 'defensive_sacks'
  | 'defensive_interceptions'

export type RiskLevel = 'conservative' | 'moderate' | 'aggressive'

export interface ParlayLeg {
  betType: BetType
  team: string
  selection: string
  line: number | null
  side: 'over' | 'under' | null
  odds: number
  confidence: number
  reasoning: string
}

export interface GameSummary {
  matchupSummary: string
  keyFactors: string[]
  gamePrediction: {
    winner: string
    projectedScore: { home: number; away: number }
    winProbability: number
  }
}

export interface GeneratedParlay {
  parlayId: string
  gameId: string
  gameContext: string
  legs: ParlayLeg[]
  combinedOdds: number
  parlayConfidence: number
  gameSummary: GameSummary
  model: string
}

export type SourceStatus = 'ok' | 'unavailable' | 'indoor'

export interface DataSources {
  stats: SourceStatus
  odds: SourceStatus
  weather: SourceStatus
}

// ===== AGENT RUN (mirrors functions/src/agent/shared/schemas.ts) =====
export type RunStatus = 'queued' | 'running' | 'succeeded' | 'canceled' | 'failed'
export type AgentStepType = 'plan' | 'tool' | 'draft' | 'validate'
export type AgentToolName = 'espn_game' | 'espn_team_stats' | 'odds'
export type StepStatus = 'running' | 'ok' | 'failed'

export interface AgentStep {
  id: string
  type: AgentStepType
  tool?: AgentToolName
  status: StepStatus
  startedAt: string
  finishedAt?: string
  durationMs?: number
  notes?: string
  tokensInput?: number
  tokensOutput?: number
  error?: { code: string; message: string }
}

export interface AgentResult {
  parlay: {
    legs: ParlayLeg[]
    combinedOdds: number
    parlayConfidence: number
    gameSummary: GameSummary
  }
  game: Game
  homeStats: TeamStats | null
  awayStats: TeamStats | null
  odds: OddsSnapshot | null
  sources: DataSources
  model: string
}

export interface RunError {
  code: string
  message: string
  details?: unknown
}

export interface RateLimitInfo {
  remaining: number
  total: number
  resetTime: string
  currentCount: number
}

export interface ParlayGenerationResult {
  parlay: GeneratedParlay
  game: Game
  homeStats: TeamStats | null
  awayStats: TeamStats | null
  odds: OddsSnapshot | null
  sources: DataSources
  rateLimitInfo?: RateLimitInfo
  runId?: string
  serviceMode: 'mock' | 'agent'
}

export interface ParlayGenerationOptions {
  riskLevel: RiskLevel
  onStep?: (step: AgentStep) => void
  signal?: AbortSignal
}

// ===== AUTH =====
export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  createdAt: Timestamp
  savedParlays?: string[]
}
