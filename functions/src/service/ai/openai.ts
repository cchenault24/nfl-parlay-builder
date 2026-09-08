import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { AIGenerateResponseSchema, type AIGenerateResponse } from './schemas'

export const PARLAY_MODEL = 'gpt-5.6-terra'

const SYSTEM_PROMPT =
  'You are an NFL betting analyst. Build exactly three parlay legs grounded strictly in the data provided. ' +
  'Never invent betting lines: when book lines are given you must use them exactly. ' +
  'Say when data was unavailable rather than guessing.'

export function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return null
  }
  return new OpenAI({ apiKey: key, timeout: 90_000, maxRetries: 0 })
}

export type DraftResult = {
  draft: AIGenerateResponse
  tokensInput: number
  tokensOutput: number
}

function aiError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code })
}

export async function draftParlay(
  client: OpenAI,
  prompt: string
): Promise<DraftResult> {
  const response = await client.responses.parse({
    model: PARLAY_MODEL,
    input: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    text: { format: zodTextFormat(AIGenerateResponseSchema, 'parlay') },
    max_output_tokens: 4000,
  })

  if (response.status === 'incomplete') {
    throw aiError(
      'ai_incomplete',
      `Model response incomplete: ${response.incomplete_details?.reason ?? 'unknown'}`
    )
  }
  for (const item of response.output) {
    if (item.type !== 'message') {
      continue
    }
    for (const part of item.content) {
      if (part.type === 'refusal') {
        throw aiError('ai_refusal', part.refusal)
      }
    }
  }
  if (!response.output_parsed) {
    throw aiError('ai_empty', 'Model returned no parsable output')
  }
  return {
    draft: response.output_parsed,
    tokensInput: response.usage?.input_tokens ?? 0,
    tokensOutput: response.usage?.output_tokens ?? 0,
  }
}
