import axios, { AxiosError, AxiosInstance } from 'axios'
import { API_CONFIG } from '../../config/api'
import {
  ESPNErrorResponse,
  ESPNRosterResponse,
  ESPNScoreboardResponse,
} from '../../types/espn'
import { ESPNError, ESPNGamesError, ESPNRosterError } from '../errors'
import {
  APIRequestConfig,
  APIResponse,
  BaseAPIClient,
  INFLClient,
} from './base'

// Request data type for POST/PUT methods
type RequestData = Record<string, unknown> | FormData | string | null

/**
 * ESPN API Client for NFL data
 * Implements the INFLClient interface
 */
export class ESPNClient extends BaseAPIClient implements INFLClient {
  private axiosInstance: AxiosInstance

  constructor() {
    super(API_CONFIG.ESPN)

    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
  }

  async get<T>(
    endpoint: string,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>> {
    return this.withRetry(async () => {
      try {
        const response = await this.axiosInstance.get(endpoint, {
          params: config?.params,
          headers: config?.headers,
          timeout: config?.timeout,
        })

        return {
          data: response.data,
          status: response.status,
          headers: response.headers as Record<string, string>,
        }
      } catch (error) {
        this.handleESPNError(error as Error, endpoint)
      }
    })
  }

  async post<T>(
    endpoint: string,
    data?: RequestData,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>> {
    return this.withRetry(async () => {
      try {
        const response = await this.axiosInstance.post(endpoint, data, {
          headers: config?.headers,
          timeout: config?.timeout,
        })

        return {
          data: response.data,
          status: response.status,
          headers: response.headers as Record<string, string>,
        }
      } catch (error) {
        this.handleESPNError(error as Error, endpoint)
      }
    })
  }

  async put<T>(
    endpoint: string,
    data?: RequestData,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>> {
    return this.withRetry(async () => {
      try {
        const response = await this.axiosInstance.put(endpoint, data, {
          headers: config?.headers,
          timeout: config?.timeout,
        })

        return {
          data: response.data,
          status: response.status,
          headers: response.headers as Record<string, string>,
        }
      } catch (error) {
        this.handleESPNError(error as Error, endpoint)
      }
    })
  }

  async delete<T>(
    endpoint: string,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>> {
    return this.withRetry(async () => {
      try {
        const response = await this.axiosInstance.delete(endpoint, {
          headers: config?.headers,
          timeout: config?.timeout,
        })

        return {
          data: response.data,
          status: response.status,
          headers: response.headers as Record<string, string>,
        }
      } catch (error) {
        this.handleESPNError(error as Error, endpoint)
      }
    })
  }

  // NFL-specific methods implementing INFLClient interface

  async getCurrentWeekGames(): Promise<APIResponse<ESPNScoreboardResponse>> {
    try {
      return await this.get<ESPNScoreboardResponse>('/scoreboard')
    } catch (error) {
      throw new ESPNGamesError(undefined, error as Error)
    }
  }

  async getGamesByWeek(
    week: number
  ): Promise<APIResponse<ESPNScoreboardResponse>> {
    try {
      const currentYear = new Date().getFullYear()
      return await this.get<ESPNScoreboardResponse>('/scoreboard', {
        params: {
          seasontype: 2, // Regular season
          week,
          year: currentYear,
        },
      })
    } catch (error) {
      throw new ESPNGamesError(week, error as Error)
    }
  }

  async getTeamRoster(
    teamId: string
  ): Promise<APIResponse<ESPNRosterResponse>> {
    try {
      const endpoint = `/teams/${teamId}/roster`
      return await this.get<ESPNRosterResponse>(endpoint)
    } catch (error) {
      throw new ESPNRosterError(teamId, error as Error)
    }
  }

  async getCurrentWeek(): Promise<APIResponse<ESPNScoreboardResponse>> {
    try {
      return await this.get<ESPNScoreboardResponse>('/scoreboard')
    } catch (error) {
      throw new ESPNGamesError(undefined, error as Error)
    }
  }

  async getAvailableWeeks(): Promise<APIResponse<number[]>> {
    // ESPN doesn't provide this endpoint, so we return static data
    // This could be enhanced to dynamically determine based on season
    const weeks = Array.from({ length: 18 }, (_, i) => i + 1)

    return {
      data: weeks,
      status: 200,
    }
  }

  // ==============================================================================
  // ERROR HANDLING
  // ==============================================================================

  /**
   * ESPN-specific error handling
   * Accepts unknown and handles type checking internally
   */
  private handleESPNError(error: unknown, endpoint: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ESPNErrorResponse>

      if (axiosError.response) {
        // Server responded with error status
        const status = axiosError.response.status
        const responseData = axiosError.response.data
        const message = responseData?.message || axiosError.message

        throw new ESPNError(message, status, endpoint, axiosError)
      } else if (axiosError.request) {
        // Network error - no response received
        throw new ESPNError(
          'Network error: Unable to reach ESPN API',
          undefined,
          endpoint,
          axiosError
        )
      }
    }

    // Handle any other error types
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown ESPN API error'

    const errorObj = error instanceof Error ? error : new Error(String(error))

    throw new ESPNError(errorMessage, undefined, endpoint, errorObj)
  }
}
