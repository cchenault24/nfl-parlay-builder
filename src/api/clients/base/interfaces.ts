// src/api/clients/base/interfaces.ts
import { APIResponse } from './types'

/**
 * NFL-specific client interface
 */
export interface INFLClient {
  /**
   * Get current NFL week games
   */
  getCurrentWeekGames(): Promise<APIResponse<any>>

  /**
   * Get games for a specific week
   */
  getGamesByWeek(week: number): Promise<APIResponse<any>>

  /**
   * Get team roster
   */
  getTeamRoster(teamId: string): Promise<APIResponse<any>>

  /**
   * Get current NFL week number
   */
  getCurrentWeek(): Promise<APIResponse<any>>

  /**
   * Get available weeks for current season
   */
  getAvailableWeeks(): Promise<APIResponse<number[]>>
}

/**
 * OpenAI-specific client interface
 */
export interface IOpenAIClient {
  /**
   * Create a chat completion
   */
  createChatCompletion(params: {
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
  }): Promise<APIResponse<any>>

  /**
   * Validate API key and connection
   */
  validateConnection(): Promise<boolean>
}
