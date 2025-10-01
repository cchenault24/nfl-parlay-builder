import { z } from 'zod'

export const BetTypeEnum = z.enum([
  'spread',
  'moneyline',
  'total',
  'team_total_points',
  'team_total_points_over',
  'team_total_points_under',
  'first_half_spread',
  'first_half_total',
  'second_half_spread',
  'second_half_total',
  'first_quarter_spread',
  'first_quarter_total',
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
  'player_pass_rush_yards',
  'player_pass_rec_yards',
  'player_pass_rush_rec_yards',
  'player_anytime_td',
  'player_first_td',
  'player_last_td',
  'team_total_tds',
  'field_goals_made',
  'field_goals_attempted',
  'longest_field_goal',
  'kicking_points',
  'extra_points_made',
  'defensive_sacks',
  'defensive_tackles',
  'defensive_interceptions',
  'defensive_forced_fumbles',
  'defensive_touchdowns',
  'special_teams_touchdowns',
  'defensive_turnovers',
  'alt_spread',
  'alt_total',
  'player_alt_rushing_yards',
  'player_alt_receiving_yards',
  'player_alt_passing_yards',
])

export const AILegSchema = z.object({
  betType: BetTypeEnum,
  selection: z.string().min(1),
  odds: z.number().int(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
})

export const AIAnalysisSchema = z.object({
  matchupSummary: z.string().min(1),
  keyFactors: z.array(z.string().min(1)).min(1).max(10),
  gamePrediction: z.object({
    winner: z.string().min(1),
    projectedScore: z.object({
      home: z.number().int(),
      away: z.number().int(),
    }),
    winProbability: z.number().min(0).max(1),
  }),
})

export const AIGenerateResponseSchema = z.object({
  legs: z.array(AILegSchema).length(3),
  analysisSummary: AIAnalysisSchema,
})

export type AIGenerateResponse = z.infer<typeof AIGenerateResponseSchema>
export type AILeg = z.infer<typeof AILegSchema>
export type AIAnalysis = z.infer<typeof AIAnalysisSchema>
