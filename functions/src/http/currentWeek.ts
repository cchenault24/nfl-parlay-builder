import { onRequest } from 'firebase-functions/v2/https'
import { z } from 'zod'

// ESPN API response interface for scoreboard
interface ESPNScoreboardResponse {
  events: Array<{
    id: string
    date: string
    week?: {
      number: number
    }
    season?: {
      year: number
    }
  }>
  week?: {
    number: number
  }
  season?: {
    year: number
  }
}

const ESPNScoreboardSchema = z.object({
  events: z
    .array(
      z.object({
        id: z.string(),
        date: z.string(),
        week: z.object({ number: z.number() }).optional(),
        season: z.object({ year: z.number() }).optional(),
      })
    )
    .optional()
    .default([]),
  week: z.object({ number: z.number() }).optional(),
  season: z.object({ year: z.number() }).optional(),
})

/**
 * Get current NFL week from ESPN API
 */
async function getCurrentWeekFromESPN(): Promise<number> {
  const espnUrl =
    'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'

  try {
    const response = await fetch(espnUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'nfl-parlay-builder-server',
      },
      // Add timeout
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      console.error(`ESPN API error: ${response.status} ${response.statusText}`)
      throw new Error(`ESPN API returned ${response.status}`)
    }

    const data: ESPNScoreboardResponse = ESPNScoreboardSchema.parse(
      await response.json()
    )

    // Try to get week from top-level response first
    if (data.week?.number) {
      console.log(`Current week from ESPN top-level: ${data.week.number}`)
      return data.week.number
    }

    // Fallback: Get week from the first event
    if (data.events && data.events.length > 0) {
      const firstEvent = data.events[0]
      if (firstEvent.week?.number) {
        console.log(`Current week from ESPN event: ${firstEvent.week.number}`)
        return firstEvent.week.number
      }
    }

    // If no week data found, throw error
    throw new Error('No week information found in ESPN response')
  } catch (error) {
    console.error('Error fetching current week from ESPN:', error)
    throw error
  }
}

export const currentWeek = onRequest(
  {
    region: 'us-central1',
    cors: [
      'http://localhost:3001',
      'http://localhost:3000',
      'https://nfl-parlay-builder.web.app',
      'https://nfl-parlay-builder.firebaseapp.com',
    ],
  },
  async (req, res) => {
    try {
      // Allow manual override via environment variable for testing
      const mockWeek = process.env.MOCK_CURRENT_WEEK

      if (mockWeek) {
        const week = Number(mockWeek)
        console.log(`Using mock current week: ${week}`)
        res.status(200).json({
          success: true,
          data: week,
          source: 'mock',
        })
        return
      }

      // Get current week from ESPN API
      const week = await getCurrentWeekFromESPN()

      console.log(`Current week from ESPN: ${week}`)
      res.status(200).json({
        success: true,
        data: week,
        source: 'espn',
      })
    } catch (error) {
      console.error('Failed to get current week:', error)

      // Fallback to a reasonable default
      const fallbackWeek = 4
      console.log(`Using fallback week: ${fallbackWeek}`)

      res.status(200).json({
        success: true,
        data: fallbackWeek,
        source: 'fallback',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
)
