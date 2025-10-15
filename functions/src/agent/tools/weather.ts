import { log } from '../../observability/logger'
import { WeatherProvider } from '../../providers/weather/client'
import { getStadiumFromTeamCode } from '../../utils/teamMapping'

export type WeatherInfo = {
  condition: string
  temperatureF: number
  windMph: number
}

/**
 * Extract game details from gameId
 * Maps team codes to stadium locations for weather lookup
 */
function extractGameDetails(gameId: string): {
  stadium: string
  city: string
  state: string
  gameTime: string
} {
  // Parse gameId format: "team1-team2-year-week" or similar
  const parts = gameId.split('-')
  if (parts.length >= 2) {
    // Try to determine stadium based on team names
    const homeTeam = parts[0]?.toUpperCase()

    // Get stadium information from centralized team mapping
    const homeStadium = getStadiumFromTeamCode(homeTeam) || {
      stadium: 'Unknown Stadium',
      city: 'Unknown City',
      state: 'XX',
    }

    return {
      stadium: homeStadium.stadium,
      city: homeStadium.city,
      state: homeStadium.state,
      gameTime: new Date().toISOString(),
    }
  }

  // Fallback for unknown format
  return {
    stadium: 'Unknown Stadium',
    city: 'Unknown City',
    state: 'XX',
    gameTime: new Date().toISOString(),
  }
}

export async function fetchWeatherForGame(
  gameId: string,
  gameContext?: {
    venue: { name: string; city: string; state: string }
    dateTime: string
  },
  apiKey?: string
): Promise<WeatherInfo | undefined> {
  try {
    let gameDetails: {
      stadium: string
      city: string
      state: string
      gameTime: string
    }

    if (gameContext) {
      // Use pre-loaded context (optimized path)
      gameDetails = {
        stadium: gameContext.venue.name,
        city: gameContext.venue.city,
        state: gameContext.venue.state,
        gameTime: gameContext.dateTime,
      }
    } else {
      // Fallback to extracting from gameId
      gameDetails = extractGameDetails(gameId)
    }

    const request = {
      gameId,
      stadium: gameDetails.stadium,
      city: gameDetails.city,
      state: gameDetails.state,
      gameTime: gameDetails.gameTime,
    }

    const weatherProvider = new WeatherProvider({
      apiKey,
    })
    const response = await weatherProvider.getWeather(request)

    if (!response) {
      return undefined
    }

    // Convert to expected format
    return {
      condition: response.data.condition,
      temperatureF: response.data.temperature,
      windMph: response.data.windSpeed,
    }
  } catch (error) {
    log.error('weather.tool.error', {
      gameId,
      error: {
        code: 'tool_error',
        message: error instanceof Error ? error.message : String(error),
      },
    })

    // Return undefined instead of fallback data
    return undefined
  }
}
