import { GeneratedParlay, NFLGame } from '../types'
import { mockOpenAIService } from './mockOpenaiService'

/**
 * OpenAI Service Wrapper
 * Automatically switches between real OpenAI API and mock data based on environment
 */
export class OpenAIServiceWrapper {
  private shouldUseMock(): boolean {
    // Use mock in development OR when explicitly enabled
    return (
      import.meta.env.NODE_ENV === 'development' ||
      import.meta.env.VITE_USE_MOCK_OPENAI === 'true' ||
      !import.meta.env.VITE_OPENAI_API_KEY // Fallback to mock if no API key
    )
  }

  /**
   * Generate parlay using appropriate service (mock or real)
   */
  async generateParlay(game: NFLGame): Promise<GeneratedParlay> {
    if (this.shouldUseMock()) {
      console.log('🎭 Using Mock OpenAI Service (Development Mode)')
      return mockOpenAIService.generateParlay(game)
    }

    console.log('🤖 Using Real OpenAI API (Production Mode)')

    // TODO: Replace with your actual OpenAI service call
    // return realOpenAIService.generateParlay(game, homeRoster, awayRoster);

    // Temporary fallback until you implement the real service integration
    throw new Error(
      'Real OpenAI service not yet integrated. Please set VITE_USE_MOCK_OPENAI=true for development.'
    )
  }

  /**
   * Get current service status for debugging
   */
  getServiceStatus(): {
    usingMock: boolean
    hasApiKey: boolean
    environment: string
  } {
    return {
      usingMock: this.shouldUseMock(),
      hasApiKey: !!import.meta.env.VITE_OPENAI_API_KEY,
      environment: import.meta.env.NODE_ENV || 'unknown',
    }
  }
}

// Export singleton instance
export const openAIService = new OpenAIServiceWrapper()

// Export both services for direct access if needed
export { mockOpenAIService }
