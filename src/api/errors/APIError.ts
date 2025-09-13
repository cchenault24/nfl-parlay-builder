export abstract class APIError extends Error {
  public readonly statusCode?: number
  public readonly endpoint?: string
  public readonly timestamp: string
  public readonly originalError?: Error

  constructor(
    message: string,
    statusCode?: number,
    endpoint?: string,
    originalError?: Error
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.endpoint = endpoint
    this.timestamp = new Date().toISOString()
    this.originalError = originalError

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Returns a sanitized error object safe for logging/UI display
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      endpoint: this.endpoint,
      timestamp: this.timestamp,
    }
  }

  /**
   * Returns user-friendly error message
   */
  abstract getUserFriendlyMessage(): string
}
