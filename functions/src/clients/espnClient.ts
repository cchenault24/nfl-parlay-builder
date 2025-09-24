import { GameRosters, NFLGame } from '@npb/shared'
import { HttpBase } from './httpBase'

export class ESPNServerClient {
  private http: HttpBase
  constructor() {
    this.http = new HttpBase('https://site.api.espn.com') // adjust as needed
  }

  async getScoreboard(week: number, season: number): Promise<NFLGame[]> {
    // map ESPN response to shared NFLGame[]
    // placeholder - implement your current mapping here
    return []
  }

  async getGameDetails(
    gameId: string
  ): Promise<{ game: NFLGame; rosters: GameRosters }> {
    // map to shared types
    return { game: {} as NFLGame, rosters: { gameId, home: [], away: [] } }
  }
}
