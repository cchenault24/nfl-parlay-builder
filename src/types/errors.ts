/**
 * Custom error class for rate limiting
 */
export class RateLimitError extends Error {
  public rateLimitInfo: {
    remaining: number
    resetTime: Date
    currentCount: number
  }

  constructor(
    message: string,
    rateLimitInfo: {
      remaining: number
      resetTime: Date
      currentCount: number
    }
  ) {
    super(message)
    this.name = 'RateLimitError'
    this.rateLimitInfo = rateLimitInfo
  }
}
