// Domain types shared by every ParlAId client (web `src/`, mobile `mobile/`).
// These mirror the server's own definitions in `functions/src`; keep them in
// sync with that package, which remains the source of truth.
//
// Deliberately dependency-free — no firebase, react or platform imports — so
// both a Vite bundle and a Metro bundle can compile this file from source.

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
  // Only meaningful once status is 'final' or 'in_progress'.
  homeScore: number | null
  awayScore: number | null
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
export interface SpreadLine {
  line: number
  homePrice: number
  awayPrice: number
}

export interface TotalLine {
  line: number
  overPrice: number
  underPrice: number
}

export interface Moneyline {
  home: number
  away: number
}

// What one book is showing for one game before any run has happened — including
// "nothing at all", which is the case the run-settings sheet needs: a book that
// has not posted this game is offered disabled with a reason rather than hidden.
export interface BookLines {
  key: string
  title: string
  posted: boolean
  lastUpdate: string | null
  spread: SpreadLine | null
  total: TotalLine | null
  moneyline: Moneyline | null
}

export interface GameBookLines {
  gameId: string
  books: BookLines[]
}

export interface WeekOdds {
  // When the slate was fetched upstream, not when this response was assembled.
  fetchedAt: string
  games: GameBookLines[]
}

// Both teams' season stats for one game, read before any run has happened.
export interface GameTeamStats {
  home: TeamStats | null
  away: TeamStats | null
}

export interface OddsSnapshot {
  eventId: string
  bookmaker: string
  bookmakerKey: string
  // Set only when the user asked for a book that had not posted this game and
  // another was used. The legs are still anchored to a real posted price — just
  // not the requested book's — so the UI has to say whose it is.
  requestedBookmakerKey?: string
  lastUpdate: string
  spread: SpreadLine | null
  total: TotalLine | null
  moneyline: Moneyline | null
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

export interface GamePrediction {
  winner: string
  projectedScore: { home: number; away: number }
  winProbability: number
}

// The model's read on one game. A parlay always carries one of these per game
// it draws on, even when that is a single game — nothing varies by run size.
export interface GameAnalysis {
  gameId: string
  matchupSummary: string
  keyFactors: string[]
  gamePrediction: GamePrediction
}

export interface GameSummary {
  games: GameAnalysis[]
  // Only meaningful across several games; null for a single-game parlay.
  slateSummary: string | null
}

export interface GeneratedParlay {
  parlayId: string
  // Every game this parlay draws on, in the order they were requested. A
  // single-game parlay carries one; nothing reads `gameIds[0]` as a special
  // case.
  gameIds: string[]
  gameContext: string
  // Carried from the games so a saved parlay can be sorted/graded later
  // without needing to look them back up. `gameDateTime` is the earliest
  // kickoff among them.
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
export type RunStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'canceled'
  | 'failed'
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
  // Present only while a step covers more than one game, so an eight-row
  // timeline can say "4 of 6" inside a row instead of growing to forty-eight.
  progress?: { done: number; total: number }
  error?: { code: string; message: string }
}

// Everything gathered for one of a run's games.
export interface AgentGameResult {
  game: Game
  homeStats: TeamStats | null
  awayStats: TeamStats | null
  odds: OddsSnapshot | null
  sources: DataSources
}

export interface AgentResult {
  parlay: {
    legs: ParlayLeg[]
    combinedOdds: number
    parlayConfidence: number
    gameSummary: GameSummary
  }
  games: AgentGameResult[]
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
  games: AgentGameResult[]
  rateLimitInfo?: RateLimitInfo
  runId?: string
  serviceMode: 'mock' | 'agent'
}

export interface ParlayGenerationOptions {
  riskLevel: RiskLevel
  // Undefined means no preference; the server picks from its own book priority.
  bookmaker?: string
  // Undefined lets the server apply the tier's default rather than the client
  // guessing at it.
  legCount?: number
  onStep?: (step: AgentStep) => void
  signal?: AbortSignal
}
