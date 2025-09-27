// ------------------------------------------------------------------------------------------------
// src/types/external/openai.ts - OpenAI API types
// ------------------------------------------------------------------------------------------------
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIRequest {
  model: string
  messages: OpenAIMessage[]
  temperature?: number
  max_tokens?: number
  response_format?: { type: 'json_object' }
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  seed?: number
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
      role: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
