import { APIError } from './APIError'

export class OpenAIError extends APIError {
  public readonly model?: string
  public readonly tokensUsed?: number

  constructor(
    message: string,
    statusCode?: number,
    model?: string,
    tokensUsed?: number,
    originalError?: Error
  ) {
    super(message, statusCode, '/chat/completions', originalError)
    this.model = model
    this.tokensUsed = tokensUsed
  }

  getUserFriendlyMessage(): string {
    if (this.statusCode === 401) {
      return 'AI service authentication failed. Please contact support.'
    }
    if (this.statusCode === 429) {
      return 'AI service is busy. Please try again in a moment.'
    }
    if (this.statusCode === 400) {
      return 'Invalid request to AI service. Please try generating a different parlay.'
    }
    if (this.statusCode && this.statusCode >= 500) {
      return 'AI service is temporarily unavailable. Please try again later.'
    }
    return 'Unable to generate AI parlay. Please try again.'
  }

  toJSON() {
    return {
      ...super.toJSON(),
      model: this.model,
      tokensUsed: this.tokensUsed,
    }
  }
}

export class OpenAIRateLimitError extends OpenAIError {
  public readonly retryAfter?: number

  constructor(retryAfter?: number, originalError?: Error) {
    super(
      'OpenAI API rate limit exceeded',
      429,
      'gpt-4o-mini',
      undefined,
      originalError
    )
    this.retryAfter = retryAfter
  }

  getUserFriendlyMessage(): string {
    const waitTime = this.retryAfter
      ? ` Please wait ${this.retryAfter} seconds.`
      : ''
    return `AI service rate limit reached.${waitTime}`
  }
}

export class OpenAIParsingError extends OpenAIError {
  constructor(response: string, originalError?: Error) {
    super(
      `Failed to parse AI response: ${response.slice(0, 100)}...`,
      undefined,
      undefined,
      undefined,
      originalError
    )
  }

  getUserFriendlyMessage(): string {
    return 'AI generated an invalid response. Please try generating a new parlay.'
  }
}
