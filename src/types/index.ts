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

// A per-week summary (mirrors functions/src/routes/public/handlers.ts) —
// used for the week picker and current-week derivation, without the cost of
// fetching the full season's games just to compute those.
export interface WeekSummary {
  week: number
  lastKickoff: string
  allFinal: boolean
}

export interface SeasonSummary {
  season: number
  weeks: WeekSummary[]
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
  // The player a player_* bet type is about; null otherwise. Needed to grade
  // the leg against a box score once the game is final.
  player: string | null
  selection: string
  line: number | null
  side: 'over' | 'under' | null
  odds: number
  confidence: number
  reasoning: string
  // Whether line/odds are the book's exact posted number (true) or an AI
  // estimate because that market wasn't posted (false) — always false for
  // player props, which this app never gets book lines for.
  anchored: boolean
}

// Mirrors functions/src/grading/types.ts.
export type LegOutcome = 'won' | 'lost' | 'push' | 'ungraded'
export type ParlayOutcome = 'won' | 'lost' | 'push' | 'partial'

export interface ParlayGrading {
  status: 'pending' | 'graded'
  gradedAt?: string
  legOutcomes?: LegOutcome[]
  parlayOutcome?: ParlayOutcome
}

// Mirrors functions/src/grading/types.ts.
export type ClvUnavailable = 'unanchored' | 'line_moved' | 'no_market'

export interface LegClosingLine {
  closingLine: number | null
  closingOdds: number | null
  // Implied-probability points gained versus the close; positive beat it.
  // Null when the leg can't be judged (see `unavailable`).
  clvPoints: number | null
  unavailable?: ClvUnavailable
}

export interface ParlayClosingLines {
  capturedAt: string
  bookmaker: string | null
  legs: LegClosingLine[]
  averageClvPoints: number | null
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
  // Carried from the game so a saved parlay can be sorted/graded later
  // without needing to look the game back up.
  week: number
  gameDateTime: string
  legs: ParlayLeg[]
  combinedOdds: number
  parlayConfidence: number
  gameSummary: GameSummary
  model: string
  // Absent = never checked. Populated by POST /parlays/grade.
  grading?: ParlayGrading
  // Absent until the pre-kickoff capture runs; absent forever for parlays
  // saved after their game started.
  closingLines?: ParlayClosingLines
  // Present only while the owner has this parlay shared by link.
  shareId?: string
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
export type AgentToolName =
  | 'espn_game'
  | 'espn_team_stats'
  | 'espn_pregame'
  | 'nflverse_epa'
  | 'odds'
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
