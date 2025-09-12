import OpenAI from 'openai'
import { fetchGameRosters } from './nflData'
import { GeneratedParlay, NFLGame } from '../types'
import { generateVarietyFactors, PARLAY_STRATEGIES } from './parlayStrategies'
import { createSystemPrompt, createParlayPrompt } from './promptGenerators'
import { parseAIResponse, createFallbackParlay } from './parlayUtils'

// Workaround for TypeScript env issue
const getEnvVar = (name: string): string => {
  return (import.meta as any).env[name] || ''
}

const openai = new OpenAI({
  apiKey: getEnvVar('VITE_OPENAI_API_KEY'),
  dangerouslyAllowBrowser: true,
})

export const generateParlay = async (
  game: NFLGame
): Promise<GeneratedParlay> => {
  try {
    // Fetch current rosters
    const { homeRoster, awayRoster } = await fetchGameRosters(game)

    // Check if we got valid rosters
    if (homeRoster.length === 0 || awayRoster.length === 0) {
      return createFallbackParlay(game)
    }

    // Generate variety factors for this parlay
    const varietyFactors = generateVarietyFactors()
    const strategy = PARLAY_STRATEGIES[varietyFactors.strategy]

    // Create prompts using the new modular system
    const systemPrompt = createSystemPrompt(strategy, varietyFactors)
    const userPrompt = createParlayPrompt(
      game,
      homeRoster,
      awayRoster,
      varietyFactors
    )

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: strategy.temperature,
      max_tokens: 1500,
      top_p: 0.9,
      frequency_penalty: 0.3, // Increased to avoid repetition
      presence_penalty: 0.4, // Increased to encourage variety
      // Add randomness with seed
      seed: Math.floor(Math.random() * 1000000),
    })

    const response = completion.choices[0]?.message?.content

    if (!response) {
      throw new Error('No response from OpenAI')
    }

    // Parse response using the new utility function
    const result = parseAIResponse(
      response,
      game,
      homeRoster,
      awayRoster,
      varietyFactors
    )

    return result
  } catch (error) {
    console.error('Error generating parlay:', error)
    return createFallbackParlay(game)
  }
}
