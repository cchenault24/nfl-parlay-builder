import { z } from 'zod'

export const GenerateParlayRequestSchema = z.object({
  gameId: z.string().min(1),
  numLegs: z.literal(3),
  week: z.number().int().min(1).max(18).optional(),
  riskLevel: z
    .enum(['conservative', 'moderate', 'aggressive'])
    .default('conservative'),
  betTypes: z
    .union([
      z.literal('all'),
      z.array(
        z.enum([
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
      ),
    ])
    .optional()
    .default('all'),
})

export type GenerateParlayResponse = {
  parlayId: string
  gameId: string
  gameContext: string
  legs: Array<{
    betType: string
    selection: string
    odds: number
    confidence: number
  }>
  combinedOdds: number
  parlayConfidence: number
  gameSummary: {
    matchupSummary: string
    keyFactors: string[]
    gamePrediction: {
      winner: string
      projectedScore: { home: number; away: number }
      winProbability: number
    }
  }
  rosterDataUsed: {
    home: Array<{ playerId: string; name: string }>
    away: Array<{ playerId: string; name: string }>
  }
}
