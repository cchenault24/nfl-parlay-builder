import { withResilience } from '../../agent/tools'
import { cache } from '../../cache/CacheClient'
import { log } from '../../observability/logger'
import { inc, observe } from '../../observability/metrics'

export interface OddsProviderConfig {
  timeoutMs: number
  retries: number
  backoffMs: number
  cacheTtlMs: number
  apiKey?: string
}

export interface OddsRequest {
  gameId: string
  homeTeam: string
  awayTeam: string
  gameTime: string // ISO string
}

export interface OddsData {
  gameId: string
  homeTeam: string
  awayTeam: string
  gameTime: string
  spread: {
    home: number
    away: number
    line: number
  }
  moneyline: {
    home: number
    away: number
  }
  total: {
    over: number
    under: number
    line: number
  }
  lastUpdated: string
  sportsbook: string
}

export interface OddsResponse {
  data: OddsData
  cached: boolean
  durationMs: number
}

export class OddsProvider {
  private config: OddsProviderConfig

  constructor(config: Partial<OddsProviderConfig> = {}) {
    this.config = {
      timeoutMs: 8_000,
      retries: 2,
      backoffMs: 400,
      cacheTtlMs: 60_000, // 1 minute (odds change frequently)
      ...config,
    }
  }

  /**
   * Get odds data for a game
   */
  async getOdds(request: OddsRequest): Promise<OddsResponse> {
    const startTime = Date.now()
    const cacheKey = {
      gameId: request.gameId,
      homeTeam: request.homeTeam,
      awayTeam: request.awayTeam,
      gameTime: request.gameTime,
    }

    try {
      const result = await cache.getOrSet(
        'odds',
        cacheKey,
        async () => {
          inc('provider_calls_odds')
          return await this.fetchOddsInternal(request)
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

      log.error('odds.provider.error', {
        gameId: request.gameId,
        homeTeam: request.homeTeam,
        awayTeam: request.awayTeam,
        error: {
          code: 'provider_error',
          message: error instanceof Error ? error.message : String(error),
        },
        durationMs,
      })

      // Return fallback data instead of throwing
      return this.getFallbackOdds(request, durationMs)
    }
  }

  /**
   * Internal method to fetch odds with resilience
   */
  private async fetchOddsInternal(request: OddsRequest): Promise<OddsData> {
    return await withResilience(
      'odds',
      async () => {
        // Return fallback data when API is unavailable
        // In production, this would call a real odds service
        const oddsData = await this.fetchMockOdds(request)

        return oddsData
      },
      {
        timeoutMs: this.config.timeoutMs,
        retries: this.config.retries,
        backoffMs: this.config.backoffMs,
      }
    )
  }

  /**
   * Fetch odds data from The Odds API
   * Documentation: https://the-odds-api.com/
   */
  private async fetchMockOdds(request: OddsRequest): Promise<OddsData> {
    const apiKey = process.env.ODDS_API_KEY
    if (!apiKey) {
      log.warn('odds.api.key.missing', { gameId: request.gameId })
      return this.getFallbackOddsData(request)
    }

    try {
      // Format team names for The Odds API
      const homeTeamFormatted = this.formatTeamNameForAPI(request.homeTeam)
      const awayTeamFormatted = this.formatTeamNameForAPI(request.awayTeam)

      // The Odds API endpoint for NFL odds
      // Using their v4 API with US bookmakers and American odds format
      const url = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${apiKey}&regions=us&markets=spreads,totals,h2h&oddsFormat=american`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(
          `The Odds API request failed: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()

      // Find matching game by team names
      const game = data.find(
        (g: { home_team: string; away_team: string }) =>
          g.home_team === homeTeamFormatted && g.away_team === awayTeamFormatted
      )

      if (!game) {
        log.warn('odds.game.not.found', {
          gameId: request.gameId,
          homeTeam: request.homeTeam,
          awayTeam: request.awayTeam,
          homeTeamFormatted,
          awayTeamFormatted,
        })
        return this.getFallbackOddsData(request)
      }

      // Get odds from the first available bookmaker (DraftKings, FanDuel, etc.)
      const bookmaker = game.bookmakers?.[0]
      if (!bookmaker) {
        log.warn('odds.bookmaker.not.found', { gameId: request.gameId })
        return this.getFallbackOddsData(request)
      }

      // Extract different betting markets
      const spreadMarket = bookmaker.markets.find(
        (m: { key: string }) => m.key === 'spreads'
      )
      const totalMarket = bookmaker.markets.find(
        (m: { key: string }) => m.key === 'totals'
      )
      const moneylineMarket = bookmaker.markets.find(
        (m: { key: string }) => m.key === 'h2h'
      )

      // Process spread data
      let spreadData = { home: 0, away: 0, line: 0 }
      if (spreadMarket?.outcomes?.length >= 2) {
        const homeOutcome = spreadMarket.outcomes.find(
          (o: { name: string }) => o.name === homeTeamFormatted
        )
        const awayOutcome = spreadMarket.outcomes.find(
          (o: { name: string }) => o.name === awayTeamFormatted
        )

        if (homeOutcome && awayOutcome) {
          spreadData = {
            home: homeOutcome.price || 0,
            away: awayOutcome.price || 0,
            line: homeOutcome.point || 0,
          }
        }
      }

      // Process moneyline data
      let moneylineData = { home: -110, away: -110 }
      if (moneylineMarket?.outcomes?.length >= 2) {
        const homeOutcome = moneylineMarket.outcomes.find(
          (o: { name: string }) => o.name === homeTeamFormatted
        )
        const awayOutcome = moneylineMarket.outcomes.find(
          (o: { name: string }) => o.name === awayTeamFormatted
        )

        if (homeOutcome && awayOutcome) {
          moneylineData = {
            home: homeOutcome.price || -110,
            away: awayOutcome.price || -110,
          }
        }
      }

      // Process total (over/under) data
      let totalData = { over: -110, under: -110, line: 45.5 }
      if (totalMarket?.outcomes?.length >= 2) {
        const overOutcome = totalMarket.outcomes.find(
          (o: { name: string }) => o.name === 'Over'
        )
        const underOutcome = totalMarket.outcomes.find(
          (o: { name: string }) => o.name === 'Under'
        )

        if (overOutcome && underOutcome) {
          totalData = {
            over: overOutcome.price || -110,
            under: underOutcome.price || -110,
            line: overOutcome.point || 45.5,
          }
        }
      }

      return {
        gameId: request.gameId,
        homeTeam: request.homeTeam,
        awayTeam: request.awayTeam,
        gameTime: request.gameTime,
        spread: spreadData,
        moneyline: moneylineData,
        total: totalData,
        lastUpdated: new Date().toISOString(),
        sportsbook: bookmaker.title || 'Unknown Sportsbook',
      }
    } catch (error) {
      log.warn('odds.api.error', {
        gameId: request.gameId,
        homeTeam: request.homeTeam,
        awayTeam: request.awayTeam,
        error: {
          code: 'api_error',
          message: error instanceof Error ? error.message : String(error),
        },
      })

      return this.getFallbackOddsData(request)
    }
  }

  /**
   * Format team name for The Odds API
   * Maps our internal team names to The Odds API's expected format
   * Based on their documentation: https://the-odds-api.com/
   */
  private formatTeamNameForAPI(teamName: string): string {
    const teamMap: Record<string, string> = {
      'Los Angeles Rams': 'Los Angeles Rams',
      'San Francisco 49ers': 'San Francisco 49ers',
      'Kansas City Chiefs': 'Kansas City Chiefs',
      'Buffalo Bills': 'Buffalo Bills',
      'Cincinnati Bengals': 'Cincinnati Bengals',
      'Miami Dolphins': 'Miami Dolphins',
      'Los Angeles Chargers': 'Los Angeles Chargers',
      'Baltimore Ravens': 'Baltimore Ravens',
      'Jacksonville Jaguars': 'Jacksonville Jaguars',
      'Pittsburgh Steelers': 'Pittsburgh Steelers',
      'Cleveland Browns': 'Cleveland Browns',
      'Houston Texans': 'Houston Texans',
      'Indianapolis Colts': 'Indianapolis Colts',
      'Tennessee Titans': 'Tennessee Titans',
      'Denver Broncos': 'Denver Broncos',
      'Las Vegas Raiders': 'Las Vegas Raiders',
      'New York Jets': 'New York Jets',
      'New England Patriots': 'New England Patriots',
      'Tampa Bay Buccaneers': 'Tampa Bay Buccaneers',
      'Dallas Cowboys': 'Dallas Cowboys',
      'Green Bay Packers': 'Green Bay Packers',
      'Chicago Bears': 'Chicago Bears',
      'Detroit Lions': 'Detroit Lions',
      'Minnesota Vikings': 'Minnesota Vikings',
      'New Orleans Saints': 'New Orleans Saints',
      'Atlanta Falcons': 'Atlanta Falcons',
      'Carolina Panthers': 'Carolina Panthers',
      'Arizona Cardinals': 'Arizona Cardinals',
      'Seattle Seahawks': 'Seattle Seahawks',
      'Washington Commanders': 'Washington Commanders',
      'New York Giants': 'New York Giants',
      'Philadelphia Eagles': 'Philadelphia Eagles',
    }

    return teamMap[teamName] || teamName
  }

  /**
   * Get fallback odds data when API fails
   */
  private getFallbackOddsData(request: OddsRequest): OddsData {
    // Generate realistic odds based on team matchup
    const homeTeamStrength = this.getTeamStrength(request.homeTeam)
    const awayTeamStrength = this.getTeamStrength(request.awayTeam)
    const strengthDiff = homeTeamStrength - awayTeamStrength

    const spreadLine = Math.round(strengthDiff * 2) / 2 // Round to nearest 0.5
    const totalLine = 45.5 // Standard NFL total
    const homeMoneyline = this.calculateMoneylineFromSpread(spreadLine)
    const awayMoneyline = this.calculateMoneylineFromSpread(-spreadLine)
    const overOdds = -110
    const underOdds = -110

    return {
      gameId: request.gameId,
      homeTeam: request.homeTeam,
      awayTeam: request.awayTeam,
      gameTime: request.gameTime,
      spread: {
        home: spreadLine > 0 ? -110 : 110,
        away: spreadLine > 0 ? 110 : -110,
        line: spreadLine,
      },
      moneyline: {
        home: homeMoneyline,
        away: awayMoneyline,
      },
      total: {
        over: overOdds,
        under: underOdds,
        line: totalLine,
      },
      lastUpdated: new Date().toISOString(),
      sportsbook: 'Fallback Sportsbook',
    }
  }

  /**
   * Get fallback odds data when API fails
   */
  private getFallbackOdds(
    request: OddsRequest,
    durationMs: number
  ): OddsResponse {
    log.warn('odds.fallback', {
      gameId: request.gameId,
      homeTeam: request.homeTeam,
      awayTeam: request.awayTeam,
      durationMs,
    })

    const fallbackData: OddsData = {
      gameId: request.gameId,
      homeTeam: request.homeTeam,
      awayTeam: request.awayTeam,
      gameTime: request.gameTime,
      spread: {
        home: -110,
        away: 110,
        line: 0,
      },
      moneyline: {
        home: -110,
        away: -110,
      },
      total: {
        over: -110,
        under: -110,
        line: 45.5,
      },
      lastUpdated: new Date().toISOString(),
      sportsbook: 'Fallback',
    }

    return {
      data: fallbackData,
      cached: false,
      durationMs,
    }
  }

  /**
   * Generate realistic spread line
   */
  private generateSpreadLine(): number {
    // Most games are within 14 points
    const spread = (Math.random() - 0.5) * 28
    return Math.round(spread * 2) / 2 // Round to nearest 0.5
  }

  /**
   * Generate realistic total line
   */
  private generateTotalLine(): number {
    // NFL totals typically range from 35-55
    const total = 35 + Math.random() * 20
    return Math.round(total * 2) / 2 // Round to nearest 0.5
  }

  /**
   * Generate moneyline based on spread
   */
  private generateMoneyline(spread: number): number {
    // Convert spread to moneyline odds
    const absSpread = Math.abs(spread)
    let moneyline: number

    if (absSpread <= 1) {
      moneyline = -110
    } else if (absSpread <= 3) {
      moneyline = spread > 0 ? -120 : 100
    } else if (absSpread <= 7) {
      moneyline = spread > 0 ? -140 : 120
    } else if (absSpread <= 14) {
      moneyline = spread > 0 ? -200 : 170
    } else {
      moneyline = spread > 0 ? -300 : 250
    }

    return moneyline
  }

  /**
   * Generate total odds
   */
  private generateTotalOdds(): number {
    // Most totals are around -110
    const baseOdds = -110
    const variation = (Math.random() - 0.5) * 20
    return Math.round(baseOdds + variation)
  }

  /**
   * Get team strength rating for fallback odds calculation
   */
  private getTeamStrength(teamName: string): number {
    // Simple strength rating based on team name patterns
    const strongTeams = [
      'Chiefs',
      'Bills',
      '49ers',
      'Eagles',
      'Cowboys',
      'Packers',
    ]
    const weakTeams = ['Jets', 'Giants', 'Bears', 'Panthers', 'Cardinals']

    if (strongTeams.some(team => teamName.includes(team))) {
      return 0.3
    }
    if (weakTeams.some(team => teamName.includes(team))) {
      return -0.3
    }
    return 0 // Even matchup
  }

  /**
   * Calculate moneyline from spread
   */
  private calculateMoneylineFromSpread(spread: number): number {
    if (spread === 0) {
      return -110
    }
    if (spread > 0) {
      return -110 - Math.abs(spread) * 20
    }
    return 110 + Math.abs(spread) * 20
  }
}

// Default provider instance
export const oddsProvider = new OddsProvider()
