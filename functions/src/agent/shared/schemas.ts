import { z } from 'zod'
import type { ScheduleGame, TeamStats } from '../../providers/espn/types'
import type { OddsSnapshot } from '../../providers/odds/client'
import type { AIAnalysis, AILeg } from '../../service/ai/schemas'

export const AgentStepTypeSchema = z.enum(['plan', 'tool', 'draft', 'validate'])
export const AgentToolNameSchema = z.enum([
  'espn_game',
  'espn_team_stats',
  'espn_pregame',
  'nflverse_epa',
  'odds',
])
export const StepStatusSchema = z.enum(['running', 'ok', 'failed'])

export const AgentStepSchema = z.object({
  id: z.string(),
  type: AgentStepTypeSchema,
  tool: AgentToolNameSchema.optional(),
  status: StepStatusSchema,
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  durationMs: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  // Set only while a step covers more than one game, so the eight-row timeline
  // reports "4 of 6" inside a row rather than becoming forty-eight rows
  // (CONTRACT §9.3). A single-game run leaves it undefined and the row renders
  // exactly as it always has.
  progress: z
    .object({
      done: z.number().int().nonnegative(),
      total: z.number().int().positive(),
    })
    .optional(),
  tokensInput: z.number().int().nonnegative().optional(),
  tokensOutput: z.number().int().nonnegative().optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
})

export const AgentBudgetSchema = z.object({
  maxRunMs: z.number().int().positive().default(90_000),
  perToolTimeoutMs: z.number().int().positive().default(15_000),
})

const SINGLE_GAME_RUN_MS = 90_000
const EXTRA_MS_PER_GAME = 20_000

// Per-game tool phases run concurrently, so the extra cost of another game is
// the model's, not the providers': a longer prompt to read and another game's
// analysis to write. Twenty seconds each is what that measured out at. One game
// is exactly the 90s it has always been, by construction.
//
// The ceiling this can reach (190s at six games) is why `timeoutSeconds` on the
// api function is 300 — the stream is held open for the whole run.
export function budgetForGames(gameCount: number): number {
  return SINGLE_GAME_RUN_MS + EXTRA_MS_PER_GAME * (gameCount - 1)
}

export const AgentRunStatusSchema = z.enum([
  'queued',
  'running',
  'succeeded',
  'canceled',
  'failed',
])

export const RiskLevelSchema = z.enum([
  'conservative',
  'moderate',
  'aggressive',
])

// The hard ceiling on a cross-game run, above whatever a tier allows. Six is
// the leg-count maximum, so at this cap every leg can still come from its own
// game and no larger number would buy anything. It also sets the run budget
// (`maxRunMs` below) and, through it, the function timeout in index.ts.
export const MAX_GAMES_PER_RUN = 6

export type SourceStatus = 'ok' | 'unavailable' | 'indoor'

// A drafted leg after the orchestrator has snapped its line/price to the
// book (for spread/total/moneyline, when available) and recorded whether
// that snap actually happened — the model's own numbers for those fields are
// discarded once `anchored` is true.
export type ProcessedLeg = AILeg & { anchored: boolean }

// Everything gathered for one of a run's games. A single-game run carries one
// of these; nothing reads `games[0]` as a special case.
export interface AgentGameResult {
  game: ScheduleGame
  homeStats: TeamStats | null
  awayStats: TeamStats | null
  odds: OddsSnapshot | null
  sources: { stats: SourceStatus; odds: SourceStatus; weather: SourceStatus }
}

export interface AgentResult {
  parlay: {
    legs: ProcessedLeg[]
    combinedOdds: number
    parlayConfidence: number
    gameSummary: AIAnalysis
  }
  games: AgentGameResult[]
  model: string
}

export const AgentRunSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: AgentRunStatusSchema,
  correlationId: z.string(),
  budget: AgentBudgetSchema,
  input: z.object({
    // Always an array, even for one game. Nothing downstream branches on the
    // length: a single-game run is a one-element slate, which is what keeps the
    // fan-out, the analysis shape and the step timeline uniform.
    gameIds: z.array(z.string().min(1)).min(1).max(MAX_GAMES_PER_RUN),
    riskLevel: RiskLevelSchema,
    // Snapshotted from the user's entitlements when the run is created, rather
    // than read again mid-run. A subscription that lapses (or starts) while the
    // agent is drafting must not change the shape of the parlay being built —
    // the draft was prompted for one thing and would then be validated against
    // another, and every leg would be rejected.
    legCount: z.number().int().min(2).max(6).default(3),
    playerProps: z.boolean().default(false),
    // Absent means "no preference" — the odds client falls through its default
    // priority. Only a plan that can choose ever sets it.
    bookmaker: z.string().optional(),
  }),
  tokensInput: z.number().int().nonnegative().default(0),
  tokensOutput: z.number().int().nonnegative().default(0),
  result: z.custom<AgentResult>().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .optional(),
})

export type AgentRun = z.infer<typeof AgentRunSchema>
export type AgentBudget = z.infer<typeof AgentBudgetSchema>
export type AgentStep = z.infer<typeof AgentStepSchema>
export type AgentToolName = z.infer<typeof AgentToolNameSchema>
export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>
export type RiskLevel = z.infer<typeof RiskLevelSchema>
