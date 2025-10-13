import { withResilience } from '../../agent/tools'
import { cache } from '../../cache/CacheClient'
import { log } from '../../observability/logger'
import { inc, observe } from '../../observability/metrics'

export interface WeatherProviderConfig {
  timeoutMs: number
  retries: number
  backoffMs: number
  cacheTtlMs: number
  apiKey?: string
}

export interface WeatherRequest {
  gameId: string
  stadium: string
  city: string
  state: string
  gameTime: string // ISO string
}

export interface WeatherData {
  temperature: number
  condition: string
  humidity: number
  windSpeed: number
  windDirection: string
  precipitation: number
  visibility: number
  gameTime: string
  stadium: string
  city: string
  state: string
}

export interface WeatherResponse {
  data: WeatherData
  cached: boolean
  durationMs: number
}

export class WeatherProvider {
  private config: WeatherProviderConfig

  constructor(config: Partial<WeatherProviderConfig> = {}) {
    this.config = {
      timeoutMs: 5_000,
      retries: 2,
      backoffMs: 300,
      cacheTtlMs: 300_000, // 5 minutes
      ...config,
    }
  }

  /**
   * Get weather data for a game
   */
  async getWeather(
    request: WeatherRequest
  ): Promise<WeatherResponse | undefined> {
    const startTime = Date.now()
    const cacheKey = {
      gameId: request.gameId,
      stadium: request.stadium,
      city: request.city,
      state: request.state,
      gameTime: request.gameTime,
    }

    try {
      const result = await cache.getOrSet(
        'weather',
        cacheKey,
        async () => {
          inc('provider_calls_weather')
          return await this.fetchWeatherInternal(request)
        },
        {
          ttlMs: this.config.cacheTtlMs,
          version: '1.0.0',
        }
      )

      const durationMs = Date.now() - startTime
      observe('provider_duration_ms', durationMs)

      return {
        data: result,
        cached: true,
        durationMs,
      }
    } catch (error) {
      const durationMs = Date.now() - startTime
      observe('provider_duration_ms', durationMs)
      inc('provider_calls_error')

      log.error('weather.provider.error', {
        gameId: request.gameId,
        stadium: request.stadium,
        city: request.city,
        state: request.state,
        error: {
          code: 'provider_error',
          message: error instanceof Error ? error.message : String(error),
        },
        durationMs,
      })

      // Return undefined instead of fallback data
      return undefined
    }
  }

  /**
   * Internal method to fetch weather with resilience
   */
  private async fetchWeatherInternal(
    request: WeatherRequest
  ): Promise<WeatherData> {
    return await withResilience(
      'weather',
      async () => {
        // Return fallback data when API is unavailable
        // In production, this would call a real weather service
        const weatherData = await this.fetchMockWeather(request)

        return weatherData
      },
      {
        timeoutMs: this.config.timeoutMs,
        retries: this.config.retries,
        backoffMs: this.config.backoffMs,
      }
    )
  }

  /**
   * Fetch weather data from WeatherAPI.com
   */
  private async fetchMockWeather(
    request: WeatherRequest
  ): Promise<WeatherData> {
    const apiKey = process.env.WEATHER_API_KEY
    if (!apiKey) {
      log.warn('weather.api.key.missing', { gameId: request.gameId })
      throw new Error('Weather API key not configured')
    }

    try {
      // Format location for WeatherAPI.com
      const location = `${request.city},${request.state},US`
      const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(location)}&aqi=no`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(
          `WeatherAPI request failed: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()

      // Convert WeatherAPI.com response to our format
      return {
        temperature: Math.round(data.current.temp_f),
        condition: data.current.condition.text,
        humidity: data.current.humidity,
        windSpeed: Math.round(data.current.wind_mph),
        windDirection: data.current.wind_dir,
        precipitation: data.current.precip_in || 0,
        visibility: data.current.vis_miles || 10,
        gameTime: request.gameTime,
        stadium: request.stadium,
        city: request.city,
        state: request.state,
      }
    } catch (error) {
      log.warn('weather.api.error', {
        gameId: request.gameId,
        city: request.city,
        state: request.state,
        error: {
          code: 'api_error',
          message: error instanceof Error ? error.message : String(error),
        },
      })

      throw error
    }
  }

  /**
   * Get fallback weather data when API fails
   */
  private getFallbackWeatherData(request: WeatherRequest): WeatherData {
    const gameTime = new Date(request.gameTime)
    const hour = gameTime.getHours()
    const month = gameTime.getMonth() + 1

    // Generate realistic fallback data based on location and time
    const baseTemp = this.getSeasonalTemperature(month, request.state)
    const hourlyVariation = this.getHourlyTemperatureVariation(hour)
    const temperature = Math.round(baseTemp + hourlyVariation)

    const conditions = this.getWeatherCondition(month)
    const humidity = this.getSeasonalHumidity(month, request.state)
    const windSpeed = this.getSeasonalWindSpeed(month, request.state)
    const windDirection = this.getRandomWindDirection()
    const precipitation = this.getSeasonalPrecipitation(month, request.state)
    const visibility = 10 // Clear visibility for fallback

    return {
      temperature,
      condition: conditions,
      humidity,
      windSpeed,
      windDirection,
      precipitation,
      visibility,
      gameTime: request.gameTime,
      stadium: request.stadium,
      city: request.city,
      state: request.state,
    }
  }

  /**
   * Get fallback weather data when API fails
   */
  private getFallbackWeather(
    request: WeatherRequest,
    durationMs: number
  ): WeatherResponse {
    log.warn('weather.fallback', {
      gameId: request.gameId,
      stadium: request.stadium,
      durationMs,
    })

    const fallbackData: WeatherData = {
      temperature: 70,
      condition: 'Clear',
      humidity: 50,
      windSpeed: 5,
      windDirection: 'NW',
      precipitation: 0,
      visibility: 10,
      gameTime: request.gameTime,
      stadium: request.stadium,
      city: request.city,
      state: request.state,
    }

    return {
      data: fallbackData,
      cached: false,
      durationMs,
    }
  }

  /**
   * Get seasonal temperature based on month and state
   */
  private getSeasonalTemperature(month: number, state: string): number {
    const isWinter = month >= 12 || month <= 2
    const isSummer = month >= 6 && month <= 8
    const isFall = month >= 9 && month <= 11

    const regionTemps: Record<
      string,
      { winter: number; spring: number; summer: number; fall: number }
    > = {
      CA: { winter: 60, spring: 65, summer: 75, fall: 70 },
      FL: { winter: 75, spring: 80, summer: 85, fall: 80 },
      NY: { winter: 35, spring: 55, summer: 75, fall: 55 },
      TX: { winter: 55, spring: 70, summer: 85, fall: 70 },
      IL: { winter: 30, spring: 50, summer: 75, fall: 50 },
      PA: { winter: 35, spring: 55, summer: 75, fall: 55 },
      OH: { winter: 30, spring: 50, summer: 75, fall: 50 },
      MI: { winter: 25, spring: 45, summer: 70, fall: 45 },
      WI: { winter: 20, spring: 40, summer: 70, fall: 40 },
      MN: { winter: 15, spring: 35, summer: 70, fall: 35 },
    }

    const region = regionTemps[state] || regionTemps['NY']

    if (isWinter) {
      return region.winter
    }
    if (isSummer) {
      return region.summer
    }
    if (isFall) {
      return region.fall
    }
    return region.spring
  }

  /**
   * Get hourly temperature variation
   */
  private getHourlyTemperatureVariation(hour: number): number {
    if (hour >= 6 && hour <= 18) {
      return 5 // Daytime bonus
    }
    return -5 // Nighttime penalty
  }

  /**
   * Get weather condition based on season and location
   */
  private getWeatherCondition(month: number): string {
    const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Overcast']
    const rainyConditions = [
      'Light Rain',
      'Rain',
      'Heavy Rain',
      'Thunderstorms',
    ]

    // Higher chance of rain in spring/fall
    const isRainySeason =
      (month >= 3 && month <= 5) || (month >= 9 && month <= 11)
    const rainChance = isRainySeason ? 0.3 : 0.1

    if (Math.random() < rainChance) {
      return rainyConditions[Math.floor(Math.random() * rainyConditions.length)]
    }

    return conditions[Math.floor(Math.random() * conditions.length)]
  }

  /**
   * Get random wind direction
   */
  private getRandomWindDirection(): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    return directions[Math.floor(Math.random() * directions.length)]
  }

  /**
   * Get seasonal humidity based on month and state
   */
  private getSeasonalHumidity(month: number, _state: string): number {
    // Higher humidity in summer months, lower in winter
    const baseHumidity = month >= 6 && month <= 8 ? 70 : 50
    return baseHumidity
  }

  /**
   * Get seasonal wind speed based on month and state
   */
  private getSeasonalWindSpeed(month: number, _state: string): number {
    // Slightly higher winds in fall/winter months
    const baseWind = month >= 9 && month <= 12 ? 8 : 5
    return baseWind
  }

  /**
   * Get seasonal precipitation based on month and state
   */
  private getSeasonalPrecipitation(month: number, _state: string): number {
    // Higher precipitation in spring months
    const basePrecip = month >= 3 && month <= 5 ? 2 : 0
    return basePrecip
  }
}

// Default provider instance
export const weatherProvider = new WeatherProvider()
