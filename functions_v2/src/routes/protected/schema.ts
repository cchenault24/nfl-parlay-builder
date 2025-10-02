import { z } from 'zod'
import { PFRTeamStats } from '../../providers/pfr'
import { BetTypeEnum } from '../../service/ai/schemas'

type BetType = z.infer<typeof BetTypeEnum>

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
  parlay: {
    parlayId: string
    gameId: string
    gameContext: string
    legs: Array<{
      betType: BetType
      selection: string
      odds: number
      confidence: number
      reasoning: string
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
  }
  gameData: {
    gameId: string
    week: number
    dateTime: string
    status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
    home: {
      teamId: string
      name: string
      abbrev: string
      record: string
      overallRecord: string
      homeRecord: string
      roadRecord: string
      stats: PFRTeamStats | null
      roster: Array<{ playerId: string; name: string; position?: string }>
    }
    away: {
      teamId: string
      name: string
      abbrev: string
      record: string
      overallRecord: string
      homeRecord: string
      roadRecord: string
      stats: PFRTeamStats | null
      roster: Array<{ playerId: string; name: string; position?: string }>
    }
    venue: { name: string; city: string; state: string }
    leaders?: {
      passing?: { name: string; stats: string; value: number }
      rushing?: { name: string; stats: string; value: number }
      receiving?: { name: string; stats: string; value: number }
    }
  }
}
