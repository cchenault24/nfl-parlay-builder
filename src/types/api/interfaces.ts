import { APIRequestConfig, APIRequestData, APIResponse } from '../core'
import {
  GameRosters,
  NFLGame,
  RateLimitInfo,
  StrategyConfig,
  VarietyFactors,
} from '../domain'
import { ESPNRosterResponse, ESPNScoreboardResponse } from '../external'

// ================================================================================================
// API INTERFACES - Standardized client interfaces
// ================================================================================================

export interface INFLClient {
  getCurrentWeekGames(): Promise<APIResponse<ESPNScoreboardResponse>>
  getGamesByWeek(week: number): Promise<APIResponse<ESPNScoreboardResponse>>
  getTeamRoster(teamId: string): Promise<APIResponse<ESPNRosterResponse>>
  getCurrentWeek(): Promise<APIResponse<ESPNScoreboardResponse>>
  getAvailableWeeks(): Promise<APIResponse<number[]>>
}

export interface IAPIClient {
  get<T>(endpoint: string, config?: APIRequestConfig): Promise<APIResponse<T>>
  post<T>(
    endpoint: string,
    data?: APIRequestData,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>
  put<T>(
    endpoint: string,
    data?: APIRequestData,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>
  patch<T>(
    endpoint: string,
    data?: APIRequestData,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>
  delete<T>(
    endpoint: string,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>
}

// ================================================================================================
// CLOUD FUNCTION TYPES - Server/client shared types
// ================================================================================================
export interface CloudFunctionResponse {
  success: boolean
  data?: {
    legs: Array<{
      id: string
      betType: string
      selection: string
      target: string
      reasoning: string
      confidence: number
      odds: string
    }>
    totalOdds: string
    potentialPayout: number
    confidence: number
    reasoning: string
    generatedAt: string
    provider: string
    gameContext: string
    gameSummary: {
      matchupAnalysis: string
      gameFlow: string
      keyFactors: string[]
      prediction: string
      confidence: number
    }
  }
  error?: {
    code?: string
    message?: string
    details?: {
      remaining?: number
      resetTime?: string
      currentCount?: number
    }
  }
  rateLimitInfo?: RateLimitInfo
  metadata?: {
    requestId: string
    timestamp: string
    processingTime: number
    provider: string
    model: string
    tokens: number
    fallbackUsed: boolean
    attemptCount: number
  }
}

export interface CloudFunctionErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: {
      remaining?: number
      resetTime?: string
      currentCount?: number
      [key: string]: unknown
    }
  }
  [key: string]: unknown
}

export interface GenerateParlayRequest {
  game: NFLGame
  rosters: GameRosters
  strategy?: StrategyConfig
  varietyFactors?: VarietyFactors
  options?: {
    temperature?: number
    strategy?: string
    provider?: string
  }
}

export interface GenerateParlayResponse extends CloudFunctionResponse {
  data: {
    legs: Array<{
      id: string
      betType: string
      selection: string
      target: string
      reasoning: string
      confidence: number
      odds: string
    }>
    totalOdds: string
    potentialPayout: number
    confidence: number
    reasoning: string
    generatedAt: string
    provider: string
    gameContext: string
    gameSummary: {
      matchupAnalysis: string
      gameFlow: string
      keyFactors: string[]
      prediction: string
      confidence: number
    }
  }
}
