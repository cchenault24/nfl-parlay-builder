import { APIError } from '../../errors'
import { APIConfig, APIRequestConfig, APIResponse } from './types'

/**
 * Base API Client interface that all specific API clients should implement
 */
export interface IAPIClient {
  /**
   * Make a GET request
   */
  get<T>(endpoint: string, config?: APIRequestConfig): Promise<APIResponse<T>>

  /**
   * Make a POST request
   */
  post<T>(
    endpoint: string,
    data?: any,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>

  /**
   * Make a PUT request
   */
  put<T>(
    endpoint: string,
    data?: any,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>

  /**
   * Make a DELETE request
   */
  delete<T>(
    endpoint: string,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>

  /**
   * Get client configuration
   */
  getConfig(): APIConfig

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<APIConfig>): void
}

/**
 * Abstract base class for API clients with common functionality
 */
export abstract class BaseAPIClient implements IAPIClient {
  protected config: APIConfig

  constructor(config: APIConfig) {
    this.config = config
  }

  abstract get<T>(
    endpoint: string,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>

  abstract post<T>(
    endpoint: string,
    data?: any,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>

  abstract put<T>(
    endpoint: string,
    data?: any,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>

  abstract delete<T>(
    endpoint: string,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>

  getConfig(): APIConfig {
    return { ...this.config }
  }

  updateConfig(config: Partial<APIConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Helper method to build full URL
   */
  protected buildURL(endpoint: string): string {
    const baseURL = this.config.baseURL.endsWith('/')
      ? this.config.baseURL.slice(0, -1)
      : this.config.baseURL
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    return `${baseURL}${cleanEndpoint}`
  }

  /**
   * Helper method to handle common error scenarios
   * This method should be overridden by concrete implementations to use specific error types
   */
  protected handleError(error: any, endpoint: string): never {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.message
      const status = error.response.status
      throw new Error(`API Error ${status}: ${message} at ${endpoint}`)
    } else if (error.request) {
      // Network error
      throw new Error(`Network error occurred at ${endpoint}`)
    } else {
      // Other error
      throw new Error(`Error at ${endpoint}: ${error.message}`)
    }
  }

  /**
   * Helper method for retry logic with exponential backoff
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts?: number,
    baseDelay?: number
  ): Promise<T> {
    const attempts = maxAttempts ?? this.config.retryAttempts ?? 1
    const delay = baseDelay ?? this.config.retryDelay ?? 1000

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        if (attempt === attempts) {
          throw error
        }

        // Don't retry on client errors (4xx) except rate limiting
        if (
          error instanceof APIError &&
          error.statusCode &&
          error.statusCode >= 400 &&
          error.statusCode < 500 &&
          error.statusCode !== 429
        ) {
          throw error
        }

        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt - 1) + Math.random() * 1000
        await this.sleep(waitTime)
      }
    }

    throw new Error('Retry logic failed unexpectedly')
  }

  /**
   * Helper method for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
