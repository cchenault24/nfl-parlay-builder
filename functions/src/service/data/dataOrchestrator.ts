import { ESPNServerClient } from '../../clients/espnClient'
import {
  InjuryReport,
  MarketLine,
  Trend,
  UnifiedGameData,
  Weather,
} from '../../types'

export class DataOrchestrator {
  constructor(private readonly espn = new ESPNServerClient()) {}

  async byGameId(gameId: string): Promise<UnifiedGameData> {
    const { game, rosters } = await this.espn.getGameDetails(gameId)

    // Stubs for now
    const weather: Weather | undefined = undefined
    const injuries: InjuryReport | undefined = undefined
    const trends: Trend[] = []
    const lines: MarketLine[] = []

    return { game, rosters, weather, injuries, trends, lines }
  }
}
