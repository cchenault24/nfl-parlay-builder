import { z } from 'zod'

export const BetTypeEnum = z.enum([
  'spread',
  'moneyline',
  'total',
  'team_total_points',
  'first_half_spread',
  'first_half_total',
  'player_passing_yards',
  'player_passing_attempts',
  'player_passing_completions',
  'player_passing_tds',
  'player_interceptions',
  'player_longest_completion',
  'player_rushing_yards',
  'player_rushing_attempts',
  'player_rushing_tds',
  'player_longest_rush',
  'player_receiving_yards',
  'player_receptions',
  'player_receiving_tds',
  'player_longest_reception',
  'player_rush_rec_yards',
  'player_anytime_td',
  'player_first_td',
  'team_total_tds',
  'field_goals_made',
  'kicking_points',
  'defensive_sacks',
  'defensive_interceptions',
])

export const AILegSchema = z.object({
  betType: BetTypeEnum,
  team: z.string(),
  // Exact player name for a player_* bet type (needed to grade the leg
  // against a box score later); null for every other bet type.
  player: z.string().nullable(),
  selection: z.string(),
  line: z.number().nullable(),
  side: z.enum(['over', 'under']).nullable(),
  odds: z.number().int(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
})

export const AIAnalysisSchema = z.object({
  matchupSummary: z.string(),
  keyFactors: z.array(z.string()).min(3).max(5),
  gamePrediction: z.object({
    winner: z.string(),
    projectedScore: z.object({
      home: z.number().int(),
      away: z.number().int(),
    }),
    winProbability: z.number().min(0).max(1),
  }),
})

// analysisSummary comes first: structured-output generation fills fields in
// schema order, so the model works out its read on the game before it has to
// commit to specific legs, rather than the other way around.
export const AIGenerateResponseSchema = z.object({
  analysisSummary: AIAnalysisSchema,
  legs: z.array(AILegSchema).min(3).max(3),
})

export type AIGenerateResponse = z.infer<typeof AIGenerateResponseSchema>
export type AILeg = z.infer<typeof AILegSchema>
export type AIAnalysis = z.infer<typeof AIAnalysisSchema>
export type BetType = z.infer<typeof BetTypeEnum>
