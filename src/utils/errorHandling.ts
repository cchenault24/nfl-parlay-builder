// ------------------------------------------------------------------------------------------------
// Shared Error Handling Utilities
// ------------------------------------------------------------------------------------------------

/**
 * Common error types
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface ProcessedError {
  message: string
  severity: ErrorSeverity
  code?: string
  context: ErrorContext
  originalError?: Error
  userFriendlyMessage: string
  shouldRetry: boolean
  retryAfter?: number
}

/**
 * Error classification rules
 */
export const ERROR_CLASSIFICATION = {
  // Network errors
  NETWORK_ERROR: {
    patterns: [/fetch failed/, /network error/, /connection refused/],
    severity: 'medium' as const,
    shouldRetry: true,
    retryAfter: 5000,
  },

  // Rate limit errors
  RATE_LIMIT: {
    patterns: [/rate limit/, /too many requests/, /429/],
    severity: 'medium' as const,
    shouldRetry: true,
    retryAfter: 60000,
  },

  // Authentication errors
  AUTH_ERROR: {
    patterns: [/unauthorized/, /401/, /authentication failed/],
    severity: 'high' as const,
    shouldRetry: false,
  },

  // Validation errors
  VALIDATION_ERROR: {
    patterns: [/validation/, /invalid/, /400/],
    severity: 'low' as const,
    shouldRetry: false,
  },

  // Server errors
  SERVER_ERROR: {
    patterns: [/500/, /internal server error/, /service unavailable/],
    severity: 'high' as const,
    shouldRetry: true,
    retryAfter: 10000,
  },

  // Timeout errors
  TIMEOUT_ERROR: {
    patterns: [/timeout/, /request timeout/],
    severity: 'medium' as const,
    shouldRetry: true,
    retryAfter: 3000,
  },
} as const

/**
 * Process an error and return structured error information
 */
export function processError(
  error: unknown,
  context: Partial<ErrorContext> = {}
): ProcessedError {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorCode = error instanceof Error ? error.name : 'UnknownError'

  const errorContext: ErrorContext = {
    component: context.component || 'Unknown',
    action: context.action || 'Unknown',
    userId: context.userId,
    timestamp: new Date().toISOString(),
    metadata: context.metadata,
  }

  // Classify the error
  const classification = classifyError(errorMessage)

  return {
    message: errorMessage,
    severity: classification.severity,
    code: errorCode,
    context: errorContext,
    originalError: error instanceof Error ? error : undefined,
    userFriendlyMessage: getUserFriendlyMessage(
      errorMessage,
      classification.severity
    ),
    shouldRetry: classification.shouldRetry,
    retryAfter: classification.retryAfter,
  }
}

/**
 * Classify an error based on its message
 */
function classifyError(message: string): {
  severity: ErrorSeverity
  shouldRetry: boolean
  retryAfter?: number
} {
  const lowerMessage = message.toLowerCase()

  for (const [type, config] of Object.entries(ERROR_CLASSIFICATION)) {
    if (config.patterns.some(pattern => pattern.test(lowerMessage))) {
      return {
        severity: config.severity,
        shouldRetry: config.shouldRetry,
        retryAfter: config.retryAfter,
      }
    }
  }

  // Default classification
  return {
    severity: 'medium',
    shouldRetry: false,
  }
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(
  message: string,
  severity: ErrorSeverity
): string {
  const lowerMessage = message.toLowerCase()

  // Network errors
  if (
    lowerMessage.includes('fetch failed') ||
    lowerMessage.includes('network')
  ) {
    return 'Unable to connect to the server. Please check your internet connection and try again.'
  }

  // Rate limit errors
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
    return "You've reached your request limit. Please wait a moment before trying again."
  }

  // Authentication errors
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
    return 'Your session has expired. Please sign in again.'
  }

  // Validation errors
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
    return 'Please check your input and try again.'
  }

  // Server errors
  if (
    lowerMessage.includes('500') ||
    lowerMessage.includes('internal server error')
  ) {
    return 'The server is experiencing issues. Please try again in a few moments.'
  }

  // Timeout errors
  if (lowerMessage.includes('timeout')) {
    return 'The request is taking longer than expected. Please try again.'
  }

  // Default messages based on severity
  switch (severity) {
    case 'critical':
      return 'A critical error occurred. Please contact support if this continues.'
    case 'high':
      return 'Something went wrong. Please try again or contact support if the issue persists.'
    case 'medium':
      return 'An error occurred. Please try again.'
    case 'low':
      return 'Please check your input and try again.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Create an error handler for async operations
 */
export function createErrorHandler(context: Partial<ErrorContext>) {
  return (error: unknown) => {
    const processedError = processError(error, context)

    // Log the error (in development)
    if (import.meta.env.DEV) {
      console.error('Error processed:', processedError)
    }

    // You could also send to error tracking service here
    // errorTrackingService.captureError(processedError)

    return processedError
  }
}

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context: Partial<ErrorContext> = {}
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const processedError = processError(error, context)

      // Don't retry if error shouldn't be retried
      if (!processedError.shouldRetry) {
        throw error
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }

      // Calculate delay with exponential backoff
      const delay =
        processedError.retryAfter || baseDelay * Math.pow(2, attempt - 1)

      if (import.meta.env.DEV) {
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`)
      }

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Error boundary helper for React components
 */
export function createErrorBoundaryHandler(componentName: string) {
  return (error: Error, errorInfo: { componentStack: string }) => {
    const processedError = processError(error, {
      component: componentName,
      action: 'render',
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    })

    // Log the error
    console.error(`Error in ${componentName}:`, processedError)

    // You could also send to error tracking service here
    // errorTrackingService.captureError(processedError)
  }
}

/**
 * Common error messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR:
    'Unable to connect to the server. Please check your internet connection.',
  RATE_LIMIT:
    "You've reached your request limit. Please wait a moment before trying again.",
  AUTH_ERROR: 'Your session has expired. Please sign in again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'The server is experiencing issues. Please try again later.',
  TIMEOUT_ERROR:
    'The request is taking longer than expected. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const processedError = processError(error)
  return processedError.shouldRetry
}

/**
 * Get retry delay for an error
 */
export function getRetryDelay(error: unknown): number | undefined {
  const processedError = processError(error)
  return processedError.retryAfter
}
