// Define a basic game item type for PFR
interface GameItem {
  gameId: string
  week: number
  home: {
    teamId: string
    name: string
    abbrev: string
    record: string
    overallRecord: string
    homeRecord: string
    roadRecord: string
    stats: {
      offenseRankings: {
        totalYardsRank: number
        passingYardsRank: number
        rushingYardsRank: number
        pointsScoredRank: number
      }
      defenseRankings: {
        totalYardsAllowedRank: number
        pointsAllowedRank: number
        turnoversRank: number
      }
      overallOffenseRank: number
      overallDefenseRank: number
      overallTeamRank: number
      specialTeamsRank?: number
    } | null
  }
  away: {
    teamId: string
    name: string
    abbrev: string
    record: string
    overallRecord: string
    homeRecord: string
    roadRecord: string
    stats: {
      offenseRankings: {
        totalYardsRank: number
        passingYardsRank: number
        rushingYardsRank: number
        pointsScoredRank: number
      }
      defenseRankings: {
        totalYardsAllowedRank: number
        pointsAllowedRank: number
        turnoversRank: number
      }
      overallOffenseRank: number
      overallDefenseRank: number
      overallTeamRank: number
      specialTeamsRank?: number
    } | null
  }
  venue?: {
    name: string
    city: string
    state: string
  }
  status?: string
  weather?: {
    condition: string
    temperatureF: number
    windMph: number
  }
  leaders?: {
    passing?: { name: string; stats: string; value: number }
    rushing?: { name: string; stats: string; value: number }
    receiving?: { name: string; stats: string; value: number }
  }
  dateTime?: string
}
import { getOpenAI, withTimeout } from './openai'
import { buildParlayPrompt } from './promptBuilder'
import { AIGenerateResponseSchema, type AIGenerateResponse } from './schemas'

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
    if (!client) {
      return null
    }

    const completion = await withTimeout(
      client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an NFL betting assistant that outputs STRICT JSON only.',
          },
          {
            role: 'user',
            content: buildParlayPrompt({
              gameData: params.gameData,
              riskLevel: params.riskLevel,
            }),
          },
        ],
        temperature,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
      30_000 // Increased timeout from 15s to 30s
    )

    const content = completion.choices[0]?.message?.content ?? ''

    if (!content) {
      return null
    }

    const parsed = AIGenerateResponseSchema.safeParse(JSON.parse(content))
    if (!parsed.success) {
      return null
    }

    return parsed.data
  } catch {
    return null
  }
}
