import { z } from 'zod'
import type { ScheduleGame, TeamStats } from '../../providers/espn/types'
import type { OddsSnapshot } from '../../providers/odds/client'
import type { AIAnalysis, AILeg } from '../../service/ai/schemas'

export const AgentStepTypeSchema = z.enum(['plan', 'tool', 'draft', 'validate'])
export const AgentToolNameSchema = z.enum(['espn_game', 'espn_team_stats', 'odds'])
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
  tokensInput: z.number().int().nonnegative().optional(),
  tokensOutput: z.number().int().nonnegative().optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
})

export const AgentBudgetSchema = z.object({
  maxRunMs: z.number().int().positive().default(90_000),
  perToolTimeoutMs: z.number().int().positive().default(15_000),
})

export const AgentRunStatusSchema = z.enum([
  'queued',
  'running',
  'succeeded',
  'canceled',
  'failed',
])

export const RiskLevelSchema = z.enum(['conservative', 'moderate', 'aggressive'])

export type SourceStatus = 'ok' | 'unavailable' | 'indoor'

// A drafted leg after the orchestrator has snapped its line/price to the
// book (for spread/total/moneyline, when available) and recorded whether
// that snap actually happened — the model's own numbers for those fields are
// discarded once `anchored` is true.
export type ProcessedLeg = AILeg & { anchored: boolean }

export interface AgentResult {
  parlay: {
    legs: ProcessedLeg[]
    combinedOdds: number
    parlayConfidence: number
    gameSummary: AIAnalysis
  }
  game: ScheduleGame
  homeStats: TeamStats | null
  awayStats: TeamStats | null
  odds: OddsSnapshot | null
  sources: { stats: SourceStatus; odds: SourceStatus; weather: SourceStatus }
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
    gameId: z.string().min(1),
    riskLevel: RiskLevelSchema,
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
