// ------------------------------------------------------------------------------------------------
// Standardized error types
// ------------------------------------------------------------------------------------------------
export class HTTPError<T = unknown> extends Error {
  public readonly status: number
  public readonly body: T | undefined

  constructor(message: string, status: number, body?: T) {
    super(message)
    this.name = 'HTTPError'
    this.status = status
    this.body = body
  }
}

export class RateLimitError extends Error {
  public readonly remaining: number
  public readonly resetTime: string
  public readonly currentCount: number

  constructor(
    message: string,
    remaining: number,
    resetTime: string,
    currentCount: number
  ) {
    super(message)
    this.name = 'RateLimitError'
    this.remaining = remaining
    this.resetTime = resetTime
    this.currentCount = currentCount
  }
}

export class ValidationError extends Error {
  public readonly errors: string[]

  constructor(message: string, errors: string[]) {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors
  }
}
