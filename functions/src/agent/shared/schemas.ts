import { z } from 'zod'
import { AIGenerateResponseSchema } from '../../service/ai/schemas'

export const AgentToolInputSchema = z.object({
  name: z.string(),
  params: z.record(z.any()).default({}),
})

export const AgentToolResultSchema = z.object({
  name: z.string(),
  ok: z.boolean(),
  durationMs: z.number().nonnegative(),
  data: z.unknown().optional(),
  error: z
    .object({ code: z.string(), message: z.string(), retriable: z.boolean() })
    .optional(),
})

export const AgentStepSchema = z.object({
  id: z.string(),
  type: z.enum(['plan', 'tool', 'draft', 'validate', 'refine', 'final']),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  tools: z.array(AgentToolResultSchema).optional(),
  tokensInput: z.number().int().nonnegative().default(0),
  tokensOutput: z.number().int().nonnegative().default(0),
  notes: z.string().optional(),
})

export const AgentBudgetSchema = z.object({
  maxRunMs: z.number().int().positive().default(90_000),
  maxModelTokens: z.number().int().positive().default(20_000),
  maxSteps: z.number().int().positive().default(8),
  perToolTimeoutMs: z.number().int().positive().default(2_000),
})

export const AgentRunStatusSchema = z.enum([
  'queued',
  'running',
  'succeeded',
  'canceled',
  'failed',
])

// Enhanced game context schema for agent input
export const GameContextSchema = z.object({
  gameId: z.string(),
  week: z.number().int().positive(),
  dateTime: z.string(),
  status: z.enum(['scheduled', 'in_progress', 'final', 'postponed']),
  home: z.object({
    teamId: z.string(),
    name: z.string(),
    abbrev: z.string(),
    record: z.string(),
    overallRecord: z.string(),
    homeRecord: z.string(),
    roadRecord: z.string(),
  }),
  away: z.object({
    teamId: z.string(),
    name: z.string(),
    abbrev: z.string(),
    record: z.string(),
    overallRecord: z.string(),
    homeRecord: z.string(),
    roadRecord: z.string(),
  }),
  venue: z.object({
    name: z.string(),
    city: z.string(),
    state: z.string(),
  }),
})

// Enhanced result schema for agent runs with tool responses
export const AgentResultSchema = z.object({
  parlay: AIGenerateResponseSchema,
  gameData: z.object({
    gameId: z.string(),
    week: z.number().int().positive(),
    dateTime: z.string(),
    status: z.enum(['scheduled', 'in_progress', 'final', 'postponed']),
    home: z.object({
      teamId: z.string(),
      name: z.string(),
      abbrev: z.string(),
      record: z.string(),
      overallRecord: z.string(),
      homeRecord: z.string(),
      roadRecord: z.string(),
      stats: z.any().nullable(),
    }),
    away: z.object({
      teamId: z.string(),
      name: z.string(),
      abbrev: z.string(),
      record: z.string(),
      overallRecord: z.string(),
      homeRecord: z.string(),
      roadRecord: z.string(),
      stats: z.any().nullable(),
    }),
    venue: z.object({
      name: z.string(),
      city: z.string(),
      state: z.string(),
    }),
    weather: z
      .object({
        condition: z.string(),
        temperatureF: z.number(),
        windMph: z.number(),
      })
      .optional(),
    leaders: z
      .object({
        passing: z
          .object({
            name: z.string(),
            stats: z.string(),
            value: z.number(),
          })
          .optional(),
        rushing: z
          .object({
            name: z.string(),
            stats: z.string(),
            value: z.number(),
          })
          .optional(),
        receiving: z
          .object({
            name: z.string(),
            stats: z.string(),
            value: z.number(),
          })
          .optional(),
      })
      .optional(),
  }),
  toolResponses: z
    .object({
      weather: z
        .object({
          condition: z.string(),
          temperatureF: z.number(),
          windMph: z.number(),
        })
        .optional(),
      odds: z
        .object({
          moneylineHome: z.number(),
          moneylineAway: z.number(),
          totalPoints: z.number(),
          spreadHome: z.number(),
        })
        .optional(),
    })
    .optional(),
})

export const AgentRunSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: AgentRunStatusSchema,
  correlationId: z.string(),
  budget: AgentBudgetSchema,
  input: z.object({
    gameId: z.string(),
    gameContext: GameContextSchema.optional(), // Rich game context
    numLegs: z.number().int().positive(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  }),
  tokensInput: z.number().int().nonnegative().default(0),
  tokensOutput: z.number().int().nonnegative().default(0),
  steps: z.array(AgentStepSchema).default([]),
  result: AgentResultSchema.optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
    })
    .optional(),
})

export type AgentRun = z.infer<typeof AgentRunSchema>
export type AgentBudget = z.infer<typeof AgentBudgetSchema>
export type AgentToolResult = z.infer<typeof AgentToolResultSchema>
export type AgentStep = z.infer<typeof AgentStepSchema>
export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>
export type GameContext = z.infer<typeof GameContextSchema>
export type AgentResult = z.infer<typeof AgentResultSchema>

export const AIGenerateResponseStrictSchema =
  AIGenerateResponseSchema.superRefine((val, ctx) => {
    try {
      if (!Array.isArray(val.legs) || val.legs.length !== 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'legs must have length 3',
          path: ['legs'],
        })
      }
      for (let i = 0; i < val.legs.length; i++) {
        const leg = val.legs[i]
        const absOdds = Math.abs(leg.odds)
        if (absOdds < 100 || absOdds > 20000) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'leg odds out of sane bounds',
            path: ['legs', i, 'odds'],
          })
        }
        if (!leg.selection || typeof leg.selection !== 'string') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'selection must be non-empty string',
            path: ['legs', i, 'selection'],
          })
        }
        if (!leg.team || typeof leg.team !== 'string') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'team must be non-empty string',
            path: ['legs', i, 'team'],
          })
        }
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sanity checks failed',
      })
    }
  })
