export type WeatherInfo = {
  condition: string
  temperatureF: number
  windMph: number
}

// Stubbed local weather provider. In prod, wire to a real API with withResilience
export async function fetchWeatherForGame(
  _gameId: string
): Promise<WeatherInfo> {
  // Deterministic, fast response for emulator
  return {
    condition: 'Clear',
    temperatureF: 68,
    windMph: 5,
  }
}
