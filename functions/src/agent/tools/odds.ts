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

export async function fetchOddsForGame(
  gameId: string,
  gameContext?: {
    home: { name: string; teamId: string }
    away: { name: string; teamId: string }
    dateTime: string
  }
): Promise<OddsSnapshot> {
  try {
    let teamDetails: {
      homeTeam: string
      awayTeam: string
      gameTime: string
    }

    if (gameContext) {
      // Use pre-loaded context (optimized path)
      teamDetails = {
        homeTeam: gameContext.home.name,
        awayTeam: gameContext.away.name,
        gameTime: gameContext.dateTime,
      }

      // Debug logging - Odds tool with context
      console.info('💰 [Odds Tool] Using pre-loaded context:', {
        gameId,
        homeTeam: teamDetails.homeTeam,
        awayTeam: teamDetails.awayTeam,
        gameTime: teamDetails.gameTime,
      })
    } else {
      // Fallback to extracting from gameId
      teamDetails = extractTeamDetails(gameId)

      // Debug logging - Odds tool fallback
      console.info('💰 [Odds Tool] Using fallback extraction:', {
        gameId,
        homeTeam: teamDetails.homeTeam,
        awayTeam: teamDetails.awayTeam,
        gameTime: teamDetails.gameTime,
      })
    }

    const request = {
      gameId,
      homeTeam: teamDetails.homeTeam,
      awayTeam: teamDetails.awayTeam,
      gameTime: teamDetails.gameTime,
    }

    const response = await oddsProvider.getOdds(request)

    // Debug logging - Odds API response
    console.info('💰 [Odds Tool] API response:', {
      gameId,
      moneyline: response.data.moneyline,
      total: response.data.total,
      spread: response.data.spread,
    })

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
