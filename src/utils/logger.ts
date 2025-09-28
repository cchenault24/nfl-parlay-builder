// ------------------------------------------------------------------------------------------------
// Centralized Logging Utility
// ------------------------------------------------------------------------------------------------

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  component?: string
  action?: string
  userId?: string
  metadata?: Record<string, unknown>
}

export interface LogEntry {
  level: LogLevel
  message: string
  context?: LogContext
  timestamp: string
  data?: unknown
}

class Logger {
  private isDevelopment = import.meta.env.DEV
  private isProduction = import.meta.env.PROD

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true
    if (this.isProduction) {
      // In production, only log warnings and errors
      return level === 'warn' || level === 'error'
    }
    return false
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
    data?: unknown
  ): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? `[${context.component || 'Unknown'}]` : ''
    const levelStr = level.toUpperCase().padEnd(5)

    return `${timestamp} ${levelStr} ${contextStr} ${message}`
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    data?: unknown
  ): void {
    if (!this.shouldLog(level)) return

    const formattedMessage = this.formatMessage(level, message, context, data)

    switch (level) {
      case 'debug':
        console.log(formattedMessage, data || '')
        break
      case 'info':
        console.info(formattedMessage, data || '')
        break
      case 'warn':
        console.warn(formattedMessage, data || '')
        break
      case 'error':
        console.error(formattedMessage, data || '')
        break
    }
  }

  debug(message: string, context?: LogContext, data?: unknown): void {
    this.log('debug', message, context, data)
  }

  info(message: string, context?: LogContext, data?: unknown): void {
    this.log('info', message, context, data)
  }

  warn(message: string, context?: LogContext, data?: unknown): void {
    this.log('warn', message, context, data)
  }

  error(message: string, context?: LogContext, data?: unknown): void {
    this.log('error', message, context, data)
  }

  // Specialized logging methods
  apiRequest(endpoint: string, method: string, context?: LogContext): void {
    this.debug(`API Request: ${method} ${endpoint}`, context)
  }

  apiResponse(endpoint: string, status: number, context?: LogContext): void {
    const level = status >= 400 ? 'error' : 'debug'
    this.log(level, `API Response: ${status} ${endpoint}`, context)
  }

  storeUpdate(storeName: string, action: string, context?: LogContext): void {
    this.debug(`Store Update: ${storeName} - ${action}`, context)
  }

  userAction(action: string, userId?: string, context?: LogContext): void {
    this.info(`User Action: ${action}`, { ...context, userId })
  }

  errorBoundary(
    error: Error,
    componentName: string,
    context?: LogContext
  ): void {
    this.error(
      `Error Boundary: ${componentName}`,
      { ...context, component: componentName },
      error
    )
  }

  performance(operation: string, duration: number, context?: LogContext): void {
    this.debug(`Performance: ${operation} took ${duration}ms`, context)
  }
}

// Create singleton instance
export const logger = new Logger()

// Convenience functions for common use cases
export const logApiRequest = (
  endpoint: string,
  method: string,
  context?: LogContext
) => {
  logger.apiRequest(endpoint, method, context)
}

export const logApiResponse = (
  endpoint: string,
  status: number,
  context?: LogContext
) => {
  logger.apiResponse(endpoint, status, context)
}

export const logStoreUpdate = (
  storeName: string,
  action: string,
  context?: LogContext
) => {
  logger.storeUpdate(storeName, action, context)
}

export const logUserAction = (
  action: string,
  userId?: string,
  context?: LogContext
) => {
  logger.userAction(action, userId, context)
}

export const logError = (
  message: string,
  error: Error,
  context?: LogContext
) => {
  logger.error(message, context, error)
}

export const logWarning = (
  message: string,
  context?: LogContext,
  data?: unknown
) => {
  logger.warn(message, context, data)
}

export const logInfo = (
  message: string,
  context?: LogContext,
  data?: unknown
) => {
  logger.info(message, context, data)
}

export const logDebug = (
  message: string,
  context?: LogContext,
  data?: unknown
) => {
  logger.debug(message, context, data)
}

// Development-only logging
export const devLog = (message: string, data?: unknown) => {
  if (import.meta.env.DEV) {
    console.log(`[DEV] ${message}`, data || '')
  }
}

// Production error logging (for external services)
export const prodError = (
  message: string,
  error: Error,
  context?: LogContext
) => {
  if (import.meta.env.PROD) {
    // Here you could send to external logging service
    // errorTrackingService.captureError(error, { message, context })
    console.error(`[PROD] ${message}`, error, context)
  }
}
