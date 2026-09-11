import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { parsePartialJson } from './partialJson'
import { buildGenerateResponseSchema, type AIGenerateResponse } from './schemas'

export const PARLAY_MODEL = 'gpt-5.6-terra'

const SYSTEM_PROMPT =
  'You are an NFL betting analyst. Build exactly the number of parlay legs requested, grounded strictly in the data provided. ' +
  'Never invent betting lines: when book lines are given you must use them exactly. ' +
  'Say when data was unavailable rather than guessing.'

// One game's analysis and legs fit comfortably in 4000. Each extra game adds a
// matchupSummary, up to five key factors and a prediction, so the ceiling has
// to grow with the slate or a six-game run truncates and comes back
// `ai_incomplete` having spent the tokens anyway.
const BASE_OUTPUT_TOKENS = 4000
const OUTPUT_TOKENS_PER_EXTRA_GAME = 1200

// How often the draft-so-far is worth sending. Deltas arrive many times a
// second and the document grows to several KB, so forwarding every one would
// push hundreds of KB down the stream to redraw text that a reader cannot
// follow that fast anyway. Four frames a second reads as continuous typing.
const PREVIEW_INTERVAL_MS = 250

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

export interface DraftOptions {
  // The response schema is built to this exact count, so the model cannot
  // return a different number of legs than the validator will accept.
  legCount: number
  gameCount: number
  // Required because this is the one call in a run with no bound of its own:
  // every tool goes through `withResilience`, but a draft would otherwise run
  // until the client-level timeout, which is long enough to outlive the whole
  // run budget and get the instance killed mid-write. Callers pass what's left
  // of the budget.
  timeoutMs: number
  signal?: AbortSignal
  // Called with the draft as far as the model has written it, whenever that
  // changes shape. The value is a partial of `AIGenerateResponse` and is for
  // display only — the validator and the pricing only ever see the parsed final
  // response.
  onPartial?: (partial: unknown) => void
}

export async function draftParlay(
  client: OpenAI,
  prompt: string,
  { legCount, gameCount, timeoutMs, signal, onPartial }: DraftOptions
): Promise<DraftResult> {
  let response
  // Set when our own deadline aborts the stream, which is what tells the abort
  // below apart from the caller cancelling the run.
  let timedOut = false
  try {
    const stream = client.responses.stream(
      {
        model: PARLAY_MODEL,
        input: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        text: {
          format: zodTextFormat(
            buildGenerateResponseSchema(legCount),
            'parlay'
          ),
        },
        // Explicit rather than relying on the default, which is medium today
        // and is not ours to depend on — this app has already been bitten once
        // by a silently wrong value it never set.
        //
        // `low` was tried and reverted. It measured 32% cheaper on a rebuilt
        // prompt but only ~10% on the real one in production (n=5 vs 6, with
        // ranges that overlapped almost entirely), because the production
        // prompt is richer than the reconstruction the benchmark used. Not
        // worth trading any reasoning quality for. `none` is off the table
        // entirely: it put player names on market legs 2 runs in 4.
        reasoning: { effort: 'medium' },
        max_output_tokens:
          BASE_OUTPUT_TOKENS + OUTPUT_TOKENS_PER_EXTRA_GAME * (gameCount - 1),
      },
      { signal, timeout: timeoutMs }
    )
    // `timeout` on a streaming request bounds getting the response started, not
    // reading it to the end — a stream that stalls mid-draft would otherwise run
    // past the whole run budget and have the instance killed mid-write, which is
    // the exact failure `timeoutMs` exists to prevent. So the deadline is held
    // here and enforced by aborting the stream.
    const deadline = setTimeout(() => {
      timedOut = true
      stream.abort()
    }, timeoutMs)
    if (onPartial) {
      // `snapshot` is every character of this content part so far, so there is
      // nothing to accumulate here. The rate check comes before the parse
      // because the parse is the expensive half at several KB a go.
      let lastSentAt = 0
      let last = ''
      stream.on('response.output_text.delta', event => {
        const now = Date.now()
        if (now - lastSentAt < PREVIEW_INTERVAL_MS) {
          return
        }
        const partial = parsePartialJson(event.snapshot)
        if (partial === null) {
          return
        }
        // A prefix that ends mid-token parses to the same thing as the one
        // before it; there is no point redrawing for that.
        const json = JSON.stringify(partial)
        if (json === last) {
          return
        }
        lastSentAt = now
        last = json
        onPartial(partial)
      })
    }
    try {
      response = await stream.finalResponse()
    } finally {
      clearTimeout(deadline)
    }
  } catch (err) {
    if (timedOut) {
      throw aiError('ai_timeout', `Draft exceeded its ${timeoutMs}ms budget`)
    }
    // The SDK's own timeout, as distinct from `signal` firing — that arrives
    // as APIUserAbortError and has to stay a cancellation. Neither sets a
    // `.code` and both inherit `.name` as plain "Error", so `instanceof` is
    // the only thing that separates them.
    if (err instanceof OpenAI.APIConnectionTimeoutError) {
      throw aiError('ai_timeout', `Draft exceeded its ${timeoutMs}ms budget`)
    }
    throw err
  }

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
