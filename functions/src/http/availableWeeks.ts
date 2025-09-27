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
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      throw new Error(`ESPN API returned ${response.status}`)
    }
    const data: ESPNScoreboardResponse = ESPNScoreboardSchema.parse(
      await response.json()
    )

    // Try to get week from top-level response first
    if (data.week?.number) {
      return data.week.number
    }

    // Fallback: Get week from the first event
    if (data.events && data.events.length > 0) {
      const firstEvent = data.events[0]
      if (firstEvent.week?.number) {
        return firstEvent.week.number
      }
    }

    throw new Error('No week information found in ESPN response')
  } catch (error) {
    console.error('Error fetching current week from ESPN:', error)
    throw error
  }
}

export const availableWeeks = onRequest(
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
      let currentWeek: number

      // Check for mock week first
      const mockWeek = process.env.MOCK_CURRENT_WEEK
      if (mockWeek) {
        currentWeek = Number(mockWeek)
        console.log(
          `Using mock current week for available weeks: ${currentWeek}`
        )
      } else {
        // Get current week from ESPN API
        currentWeek = await getCurrentWeekFromESPN()
        console.log(
          `Current week from ESPN for available weeks: ${currentWeek}`
        )
      }

      // Calculate available weeks from current week to end of regular season (week 18)
      const maxWeek = 18
      const startWeek = Math.min(Math.max(currentWeek, 1), maxWeek)
      const weeks = Array.from(
        { length: maxWeek - startWeek + 1 },
        (_, i) => startWeek + i
      )

      res.status(200).json({
        success: true,
        data: weeks,
        currentWeek,
        source: mockWeek ? 'mock' : 'espn',
      })
    } catch (error) {
      console.error('Failed to get available weeks:', error)

      // Fallback logic
      const fallbackCurrentWeek = 4
      const maxWeek = 18
      const startWeek = Math.min(Math.max(fallbackCurrentWeek, 1), maxWeek)
      const weeks = Array.from(
        { length: maxWeek - startWeek + 1 },
        (_, i) => startWeek + i
      )

      res.status(200).json({
        success: true,
        data: weeks,
        currentWeek: fallbackCurrentWeek,
        source: 'fallback',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
)
