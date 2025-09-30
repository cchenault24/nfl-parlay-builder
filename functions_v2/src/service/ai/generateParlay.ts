import type { GameItem } from '../../providers/espn'
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
      console.error('❌ OpenAI client is null - OPENAI_API_KEY may be missing')
      return null
    }

    console.log(
      '🤖 Calling OpenAI with model: gpt-4o-mini, temperature:',
      temperature
    )

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
    console.log('📝 OpenAI response length:', content.length)

    if (!content) {
      console.error('❌ OpenAI returned empty content')
      return null
    }

    const parsed = AIGenerateResponseSchema.safeParse(JSON.parse(content))
    if (!parsed.success) {
      console.error('❌ JSON parsing failed:', {
        error: parsed.error,
        content:
          content.substring(0, 500) + (content.length > 500 ? '...' : ''),
      })
      return null
    }

    console.log('✅ Successfully generated parlay with AI')
    return parsed.data
  } catch (error) {
    console.error('❌ OpenAI API call failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return null
  }
}
