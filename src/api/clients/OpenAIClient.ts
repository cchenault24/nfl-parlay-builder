// src/api/clients/OpenAIClient.ts
import OpenAI from 'openai'
import { API_CONFIG, ENV } from '../../config/api'
import {
  OpenAIError,
  OpenAIParsingError,
  OpenAIRateLimitError,
} from '../errors'
import {
  APIRequestConfig,
  APIResponse,
  BaseAPIClient,
  IOpenAIClient,
} from './base'

/**
 * OpenAI API Client for chat completions
 * Implements the IOpenAIClient interface
 */
export class OpenAIClient extends BaseAPIClient implements IOpenAIClient {
  private openai: OpenAI

  constructor() {
    super(API_CONFIG.OPENAI)

    this.openai = new OpenAI({
      apiKey: ENV.OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
    })
  }

  async get<T>(
    endpoint: string,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>> {
    throw new Error('GET method not supported for OpenAI client')
  }

  async post<T>(
    endpoint: string,
    data?: any,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>> {
    return this.withRetry(async () => {
      try {
        // OpenAI SDK handles the HTTP requests internally
        // This method is here for interface compliance
        throw new Error('Use specific OpenAI methods instead of generic POST')
      } catch (error) {
        this.handleOpenAIError(error, endpoint)
      }
    })
  }

  async put<T>(
    endpoint: string,
    data?: any,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>> {
    throw new Error('PUT method not supported for OpenAI client')
  }

  async delete<T>(
    endpoint: string,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>> {
    throw new Error('DELETE method not supported for OpenAI client')
  }

  // OpenAI-specific methods implementing IOpenAIClient interface

  async createChatCompletion(params: {
    model: string
    messages: Array<{
      role: 'system' | 'user' | 'assistant'
      content: string
    }>
    temperature?: number
    max_tokens?: number
    top_p?: number
    frequency_penalty?: number
    presence_penalty?: number
    seed?: number
  }): Promise<APIResponse<any>> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
        frequency_penalty: params.frequency_penalty,
        presence_penalty: params.presence_penalty,
        seed: params.seed,
      })

      return {
        data: completion,
        status: 200, // OpenAI SDK doesn't expose HTTP status, assume success
      }
    } catch (error) {
      this.handleOpenAIError(error, '/chat/completions')
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      // Simple test to validate API key and connection
      await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 1,
      })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * OpenAI-specific error handling
   */
  private handleOpenAIError(error: any, endpoint: string): never {
    // Handle OpenAI SDK specific errors
    if (error.status) {
      const status = error.status
      const message = error.message || 'OpenAI API error'

      if (status === 429) {
        // Extract retry-after header if available
        const retryAfter = error.headers?.['retry-after']
          ? parseInt(error.headers['retry-after'])
          : undefined

        throw new OpenAIRateLimitError(retryAfter, error)
      }

      if (status === 401) {
        throw new OpenAIError(
          'Invalid API key provided',
          status,
          API_CONFIG.OPENAI.models.default,
          undefined,
          error
        )
      }

      if (status === 400) {
        throw new OpenAIError(
          'Invalid request to OpenAI API',
          status,
          API_CONFIG.OPENAI.models.default,
          undefined,
          error
        )
      }

      if (status >= 500) {
        throw new OpenAIError(
          'OpenAI service error',
          status,
          API_CONFIG.OPENAI.models.default,
          undefined,
          error
        )
      }

      throw new OpenAIError(
        message,
        status,
        API_CONFIG.OPENAI.models.default,
        undefined,
        error
      )
    }

    // Handle parsing errors
    if (error.message?.includes('JSON') || error.message?.includes('parse')) {
      throw new OpenAIParsingError(
        error.message || 'Failed to parse OpenAI response',
        error
      )
    }

    // Handle network/connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new OpenAIError(
        'Network error: Unable to reach OpenAI API',
        undefined,
        API_CONFIG.OPENAI.models.default,
        undefined,
        error
      )
    }

    // Generic OpenAI error
    throw new OpenAIError(
      error.message || 'Unknown OpenAI API error',
      undefined,
      API_CONFIG.OPENAI.models.default,
      undefined,
      error
    )
  }
}
