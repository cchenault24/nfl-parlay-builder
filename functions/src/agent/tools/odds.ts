import { log } from '../../observability/logger'
import { oddsProvider } from '../../providers/odds/client'
import { getTeamNameFromCode } from '../../utils/teamMapping'

export type OddsSnapshot = {
  moneylineHome: number
  moneylineAway: number
  totalPoints: number
  spreadHome: number
}

/**
 * Extract team details from gameId
 * Maps team codes to full team names for odds lookup
 */
function extractTeamDetails(gameId: string): {
  homeTeam: string
  awayTeam: string
  gameTime: string
} {
  // Parse gameId format: "team1-team2-year-week" or similar
  const parts = gameId.split('-')
  if (parts.length >= 2) {
    const homeTeamCode = parts[0]?.toUpperCase()
    const awayTeamCode = parts[1]?.toUpperCase()

    return {
      homeTeam: getTeamNameFromCode(homeTeamCode),
      awayTeam: getTeamNameFromCode(awayTeamCode),
      gameTime: new Date().toISOString(),
    }
  }

  // Fallback for unknown format
  return {
    homeTeam: 'Unknown Home Team',
    awayTeam: 'Unknown Away Team',
    gameTime: new Date().toISOString(),
  }
}

export async function fetchOddsForGame(gameId: string): Promise<OddsSnapshot> {
  try {
    // Extract team details from gameId
    const teamDetails = extractTeamDetails(gameId)
    const request = {
      gameId,
      homeTeam: teamDetails.homeTeam,
      awayTeam: teamDetails.awayTeam,
      gameTime: teamDetails.gameTime,
    }

    const response = await oddsProvider.getOdds(request)

    // Convert to expected format
    return {
      moneylineHome: response.data.moneyline.home,
      moneylineAway: response.data.moneyline.away,
      totalPoints: response.data.total.line,
      spreadHome: response.data.spread.line,
    }
  } catch (error) {
    log.error('odds.tool.error', {
      gameId,
      error: {
        code: 'tool_error',
        message: error instanceof Error ? error.message : String(error),
      },
    })

    // Return fallback data
    return {
      moneylineHome: -120,
      moneylineAway: +110,
      totalPoints: 44.5,
      spreadHome: -2.5,
    }
  }
}
