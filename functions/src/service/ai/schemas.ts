import { z } from 'zod'
import { MAX_GAMES_PER_RUN } from '../../agent/shared/schemas'

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
  // Bounded at the model boundary, not only in validate. The format cannot
  // express "not zero" — a union of the two valid American ranges is rejected
  // by zodTextFormat — so the -99..99 hole stays validate's job, but a price
  // outside any plausible range is now impossible to emit at all.
  odds: z.number().int().min(-20000).max(20000),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
})

export const GamePredictionSchema = z.object({
  winner: z.string(),
  projectedScore: z.object({
    home: z.number().int(),
    away: z.number().int(),
  }),
  winProbability: z.number().min(0).max(1),
})

// What the model is asked for, per game. Note the absence of a gameId: the
// model is never asked to echo an identifier it would sooner or later invent.
// `gamePrediction.winner` names a team, a team plays once a week, and that is
// enough to derive which game the block belongs to — the same trick the legs
// use (CONTRACT §2).
export const ModelGameAnalysisSchema = z.object({
  matchupSummary: z.string(),
  keyFactors: z.array(z.string()).min(3).max(5),
  gamePrediction: GamePredictionSchema,
})

export const ModelAnalysisSchema = z.object({
  games: z.array(ModelGameAnalysisSchema).min(1).max(MAX_GAMES_PER_RUN),
  // Nullable rather than optional: structured outputs require every property
  // to be present. A single-game run sets it to null.
  slateSummary: z.string().nullable(),
})

// analysisSummary comes first: structured-output generation fills fields in
// schema order, so the model works out its read on each game before it has to
// commit to specific legs, rather than the other way around.
//
// The leg count is a parameter because the caller's tier decides it. It was
// hardcoded to exactly three, which meant a Pro user asking for four legs got a
// schema demanding three and a draft the validator then rejected for having the
// wrong number.
export function buildGenerateResponseSchema(legCount: number) {
  return z.object({
    analysisSummary: ModelAnalysisSchema,
    legs: z.array(AILegSchema).min(legCount).max(legCount),
  })
}

export type AIGenerateResponse = z.infer<
  ReturnType<typeof buildGenerateResponseSchema>
>
export type AILeg = z.infer<typeof AILegSchema>
export type ModelAnalysis = z.infer<typeof ModelAnalysisSchema>
export type ModelGameAnalysis = z.infer<typeof ModelGameAnalysisSchema>
export type BetType = z.infer<typeof BetTypeEnum>

// The stored and API-facing shape: the model's blocks with their game resolved.
// A single-game run carries an array of one — nothing varies by run size, which
// is how the leg-count default bug happened the last time something did.
export interface GameAnalysis extends ModelGameAnalysis {
  // Empty when the block's winner matched no game in the run; `validateDraft`
  // is the one place that reports it.
  gameId: string
}

export interface AIAnalysis {
  games: GameAnalysis[]
  slateSummary: string | null
}
