// functions/src/util/errors.ts

/**
 * Base error class for upstream service errors
 */
export class UpstreamError extends Error {
  public readonly context: Record<string, any>

  constructor(message: string, context: Record<string, any> = {}) {
    super(message)
    this.name = 'UpstreamError'
    this.context = context
  }
}

/**
 * Timeout error for request timeouts
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  public readonly retryAfter?: number

  constructor(message: string, retryAfter?: number) {
    super(message)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

/**
 * Data validation error
 */
export class ValidationError extends Error {
  public readonly field?: string
  public readonly value?: any

  constructor(message: string, field?: string, value?: any) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    this.value = value
  }
}

/**
 * AI provider specific error
 */
export class AIProviderError extends Error {
  public readonly provider: string
  public readonly code?: string

  constructor(message: string, provider: string, code?: string) {
    super(message)
    this.name = 'AIProviderError'
    this.provider = provider
    this.code = code
  }
}

/**
 * ESPN API specific error
 */
export class ESPNAPIError extends UpstreamError {
  constructor(message: string, status?: number, endpoint?: string) {
    super(message, { service: 'ESPN', status, endpoint })
    this.name = 'ESPNAPIError'
  }
}

/**
 * Utility function to check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof TimeoutError) return true
  if (error instanceof UpstreamError) {
    const status = error.context.status
    return status >= 500 || status === 429
  }
  if (error instanceof RateLimitError) return true

  // Check for network errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('econnreset') ||
      message.includes('etimedout')
    )
  }

  return false
}

/**
 * Utility function to get user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof TimeoutError) {
    return 'Request timed out. Please try again.'
  }

  if (error instanceof RateLimitError) {
    return 'Too many requests. Please wait a moment and try again.'
  }

  if (error instanceof ESPNAPIError) {
    return 'Unable to fetch NFL data at the moment. Please try again.'
  }

  if (error instanceof AIProviderError) {
    return 'AI service is temporarily unavailable. Please try again.'
  }

  if (error instanceof ValidationError) {
    return `Invalid input: ${error.message}`
  }

  if (error instanceof ConfigurationError) {
    return 'Service configuration error. Please contact support.'
  }

  if (error instanceof UpstreamError) {
    const status = error.context.status
    if (status === 404) {
      return 'Requested data not found.'
    }
    if (status >= 500) {
      return 'External service temporarily unavailable.'
    }
    return 'Unable to fetch data from external service.'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred.'
}
