import { z } from 'zod'
import type { GameItem } from '../../providers/espn'
import { getOpenAI, withTimeout } from './openai'

const BetTypeEnum = z.enum([
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

export async function generateParlayWithAI(params: {
  gameId: string
  riskLevel: 'conservative' | 'moderate' | 'aggressive'
  gameData: GameItem
}): Promise<AIGenerateResponse | null> {
  const temperature =
    params.riskLevel === 'aggressive'
      ? 0.8
      : params.riskLevel === 'moderate'
        ? 0.5
        : 0.3
  try {
    const client = getOpenAI()
    if (!client) return null
    const completion = await withTimeout(
      client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are an NFL betting assistant that outputs STRICT JSON only.',
          },
          {
            role: 'user',
            content:
              `Generate a 3-leg NFL parlay for this game: ` +
              `${params.gameData.away.name} @ ${params.gameData.home.name} ` +
              `(Week ${params.gameData.week}, ${new Date(params.gameData.startTime).toLocaleDateString()}) ` +
              `at ${params.gameData.venue.name} in ${params.gameData.venue.city}, ${params.gameData.venue.state}. ` +
              `\n\nGame Context:` +
              `\n- Away Team: ${params.gameData.away.name} (${params.gameData.away.abbrev}) - Record: ${params.gameData.away.overallRecord} (Home: ${params.gameData.away.homeRecord}, Road: ${params.gameData.away.roadRecord})` +
              `\n- Home Team: ${params.gameData.home.name} (${params.gameData.home.abbrev}) - Record: ${params.gameData.home.overallRecord} (Home: ${params.gameData.home.homeRecord}, Road: ${params.gameData.home.roadRecord})` +
              `\n- Venue: ${params.gameData.venue.name}, ${params.gameData.venue.city}, ${params.gameData.venue.state}` +
              `\n- Week: ${params.gameData.week}` +
              `\n- Game Status: ${params.gameData.status}` +
              `\n- Weather: ${params.gameData.weather ? `${params.gameData.weather.condition}, ${params.gameData.weather.temperatureF}°F, ${params.gameData.weather.windMph} mph winds` : 'Not available'}` +
              `\n- Game Leaders: ${
                params.gameData.leaders
                  ? `Passing: ${params.gameData.leaders.passing?.name || 'N/A'} (${params.gameData.leaders.passing?.stats || 'N/A'}), ` +
                    `Rushing: ${params.gameData.leaders.rushing?.name || 'N/A'} (${params.gameData.leaders.rushing?.stats || 'N/A'}), ` +
                    `Receiving: ${params.gameData.leaders.receiving?.name || 'N/A'} (${params.gameData.leaders.receiving?.stats || 'N/A'})`
                  : 'Not available'
              }` +
              `\n\nRisk level: ${params.riskLevel}. ` +
              `\n\nProvide a comprehensive matchup analysis considering:` +
              `\n- Team records, recent form, and head-to-head history` +
              `\n- Venue factors (home field advantage, weather impact)` +
              `\n- Key player matchups and injury reports` +
              `\n- Offensive/defensive strengths and weaknesses` +
              `\n- Coaching strategies and game plan tendencies` +
              `\n- Weather conditions and their impact on gameplay` +
              `\n- Recent performance trends and momentum` +
              `\n- Statistical advantages and situational factors` +
              `\n\nGenerate realistic betting lines and selections based on this deep analysis. ` +
              `\n\nOutput JSON with fields: ` +
              `"legs" (array of 3) with objects {betType,selection,odds(AS NUMBER),confidence(0..1)} and ` +
              `"analysisSummary" {matchupSummary(detailed 5-7 sentences with comprehensive analysis),keyFactors[](3-5 specific factors),gamePrediction{winner,projectedScore{home,away},winProbability}}. ` +
              `\n\nUse these bet types: spread, moneyline, total, player_passing_yards, player_rushing_yards, player_receiving_yards, player_anytime_td, team_total_tds, defensive_sacks, etc. ` +
              `\n\nIMPORTANT: odds must be numbers (e.g., -110, not "-110"). ` +
              `Return ONLY JSON, no prose.`,
          },
        ],
        temperature,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
      15_000
    )
    const content = completion.choices[0]?.message?.content ?? ''
    const parsed = AIGenerateResponseSchema.safeParse(JSON.parse(content))
    if (!parsed.success) return null
    return parsed.data
  } catch {
    return null
  }
}
