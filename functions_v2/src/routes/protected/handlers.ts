import express from 'express'
import { fetchPFRSeasonSchedule } from '../../providers/pfr'
import { fetchPFRTeamDataForGame } from '../../providers/pfr/teamStatsScraper'
import { generateParlayWithAI } from '../../service/ai'
import { GameItem } from '../../service/ai/generateParlay'
import {
  getIdempotentResponse,
  saveIdempotentResponse,
} from '../../storage/idempotency'
import { getCached, setCached } from '../../utils/cache'
import { errorResponse } from '../../utils/errors'
import { GamesResponse } from '../public/schema'
import {
  GenerateParlayRequestSchema,
  type GenerateParlayResponse,
} from './schema'

// Convert GamesResponse to GameItem for AI service
function convertToGameItem(game: GamesResponse): GameItem {
  return {
    gameId: game.gameId,
    week: game.week,
    home: {
      teamId: game.home.teamId,
      name: game.home.name,
      abbrev: game.home.abbrev,
      record: game.home.record,
      overallRecord: game.home.overallRecord,
      homeRecord: game.home.homeRecord,
      roadRecord: game.home.roadRecord,
      stats: game.home.stats ?? null,
    },
    away: {
      teamId: game.away.teamId,
      name: game.away.name,
      abbrev: game.away.abbrev,
      record: game.away.record,
      overallRecord: game.away.overallRecord,
      homeRecord: game.away.homeRecord,
      roadRecord: game.away.roadRecord,
      stats: game.away.stats ? game.away.stats : null,
    },
    venue: game.venue,
    status: game.status,
    weather: game.weather,
    leaders: game.leaders,
    dateTime: game.dateTime,
  }
}

// Extended request type with authentication data
interface AuthenticatedRequest extends express.Request {
  correlationId: string
  user?: { uid: string }
}

export const generateParlayHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const authReq = req as AuthenticatedRequest
  const correlationId = authReq.correlationId
  try {
    const user = authReq.user
    const idemKeyHeader = req.header('Idempotency-Key')
    if (
      user &&
      typeof idemKeyHeader === 'string' &&
      idemKeyHeader.trim().length > 0
    ) {
      const existing = await getIdempotentResponse<GenerateParlayResponse>(
        user.uid,
        idemKeyHeader,
        24 * 60 * 60 * 1000
      )
      if (existing) {
        res.setHeader('Idempotent-Replay', 'true')
        return res.json(existing)
      }
    }

    const parsed = GenerateParlayRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      const details = { fields: parsed.error.flatten().fieldErrors }
      return errorResponse(
        res,
        400,
        'validation_error',
        'Invalid request body',
        correlationId,
        details
      )
    }
    const { gameId, numLegs, week } = parsed.data
    if (numLegs !== 3) {
      return errorResponse(
        res,
        400,
        'validation_error',
        'numLegs must be exactly 3',
        correlationId
      )
    }

    // Fetch real game data from PFR with caching and statistics
    // Use provided week if available; otherwise use current week
    let targetWeek = week ?? 1 // PFR doesn't have current week, use default

    // Try to find the game in the current week first
    // Versioned to ensure updated ranking fields are included
    const cacheKey = `games_week_${targetWeek}_with_stats_v2`
    let games = await getCached<GamesResponse[]>(cacheKey, 10 * 60 * 1000) // 10 minute TTL
    if (!games) {
      // PFR doesn't support fetching all games - return empty array
      games = []
      await setCached(cacheKey, games)
    }

    // If game not found in current week, try other recent weeks
    if (!games.find(g => g.gameId === gameId)) {
      // Try neighbor weeks first, then scan remaining
      const neighborWeeks = [targetWeek - 1, targetWeek + 1].filter(
        w => w >= 1 && w <= 18
      )
      const remainingWeeks = Array.from({ length: 18 }, (_, i) => i + 1).filter(
        w => w !== targetWeek && !neighborWeeks.includes(w)
      )
      const candidateWeeks = [...neighborWeeks, ...remainingWeeks]
      for (const w of candidateWeeks) {
        if (w === targetWeek) {
          continue
        }

        const weekCacheKey = `games_week_${w}_with_stats`
        let weekGames = await getCached<GamesResponse[]>(
          weekCacheKey,
          10 * 60 * 1000
        )
        if (!weekGames) {
          // PFR doesn't support fetching all games - return empty array
          weekGames = []
          await setCached(weekCacheKey, weekGames)
        }

        if (weekGames.find(g => g.gameId === gameId)) {
          games = weekGames
          targetWeek = w
          break
        }
      }
    }

    let game = games.find(g => g.gameId === gameId)

    // If game still not found, fetch it directly from PFR using the gameId
    if (!game) {
      // Parse gameId to extract team codes and week
      // Format: homeTeam-awayTeam-season-week (e.g., "ram-sfo-2025-5")
      const gameIdParts = gameId.split('-')
      if (gameIdParts.length >= 4) {
        const homeTeamCode = gameIdParts[0]
        const awayTeamCode = gameIdParts[1]
        const season = parseInt(gameIdParts[2])
        const gameWeek = parseInt(gameIdParts[3])

        if (!isNaN(season) && !isNaN(gameWeek)) {
          try {
            // Fetch PFR stats for this specific game
            const teamData = await fetchPFRTeamDataForGame(
              homeTeamCode,
              awayTeamCode,
              season,
              gameWeek
            )

            // Fetch the PFR schedule to get actual game date/time and status
            const scheduleGames = await fetchPFRSeasonSchedule()
            const scheduleGame = scheduleGames.find(g => g.id === gameId)

            // Get team names from PFR data or use team codes as fallback
            const homeTeamName = teamData.home?.teamName || homeTeamCode
            const awayTeamName = teamData.away?.teamName || awayTeamCode

            // Use actual game data from schedule if available
            const actualDateTime =
              scheduleGame?.dateTime || new Date().toISOString()
            const actualStatus = scheduleGame?.status || 'scheduled'

            // Create a GamesResponse object with real PFR data
            game = {
              gameId,
              week: gameWeek,
              dateTime: actualDateTime,
              status: actualStatus,
              home: {
                teamId: homeTeamCode,
                name: homeTeamName,
                abbrev: homeTeamCode,
                record: teamData.home?.record || '0-0',
                overallRecord: teamData.home?.overallRecord || '0-0',
                homeRecord: teamData.home?.homeRecord || '0-0',
                roadRecord: teamData.home?.roadRecord || '0-0',
                stats: teamData.home,
              },
              away: {
                teamId: awayTeamCode,
                name: awayTeamName,
                abbrev: awayTeamCode,
                record: teamData.away?.record || '0-0',
                overallRecord: teamData.away?.overallRecord || '0-0',
                homeRecord: teamData.away?.homeRecord || '0-0',
                roadRecord: teamData.away?.roadRecord || '0-0',
                stats: teamData.away,
              },
              venue: { name: 'TBD', city: 'TBD', state: 'TBD' }, // PFR doesn't provide venue info
              leaders: {}, // PFR doesn't provide player leaders in team stats
            }
          } catch (error) {
            console.error('Error fetching PFR data for game:', gameId, error)
          }
        }
      }
    }

    if (!game) {
      return errorResponse(
        res,
        404,
        'game_not_found',
        `Game with ID ${gameId} not found`,
        correlationId
      )
    }

    // Generate parlay with AI using real game data and statistics
    const ai = process.env.OPENAI_API_KEY
      ? await generateParlayWithAI({
          gameId,
          riskLevel: parsed.data.riskLevel,
          gameData: convertToGameItem(game),
        })
      : null

    if (!ai) {
      return errorResponse(
        res,
        503,
        'ai_service_unavailable',
        'AI service is currently unavailable. Please try again later.',
        correlationId
      )
    }

    // Fetch rosters (cached per team for 10 minutes)
    // Versioned cache keys to include positions
    // PFR doesn't support roster fetching - skip this step
    const homeRoster = null
    const awayRoster = null

    const response: GenerateParlayResponse = {
      parlay: {
        parlayId: `pl_${Math.random().toString(36).slice(2, 10)}`,
        gameId,
        gameContext: `${game.away.name} @ ${game.home.name} - Week ${game.week}`,
        legs: ai.legs,
        combinedOdds: (() => {
          // Convert American odds to decimal, multiply, then convert back to American
          const decimalOdds = ai.legs.reduce((acc, leg) => {
            const decimal =
              leg.odds > 0 ? leg.odds / 100 + 1 : 100 / Math.abs(leg.odds) + 1
            return acc * decimal
          }, 1)
          if (decimalOdds >= 2) {
            return Math.round((decimalOdds - 1) * 100)
          }
          return Math.round(-100 / (decimalOdds - 1))
        })(),
        parlayConfidence: Math.min(...ai.legs.map(l => l.confidence)),
        gameSummary: ai.analysisSummary,
      },
      gameData: {
        gameId: game.gameId,
        week: game.week,
        dateTime: game.dateTime,
        status: game.status,
        home: {
          teamId: game.home.teamId,
          name: game.home.name,
          abbrev: game.home.abbrev,
          record: game.home.record,
          overallRecord: game.home.overallRecord,
          homeRecord: game.home.homeRecord,
          roadRecord: game.home.roadRecord,
          stats: game.home.stats,
          roster: (homeRoster || []).slice(0, 30),
        },
        away: {
          teamId: game.away.teamId,
          name: game.away.name,
          abbrev: game.away.abbrev,
          record: game.away.record,
          overallRecord: game.away.overallRecord,
          homeRecord: game.away.homeRecord,
          roadRecord: game.away.roadRecord,
          stats: game.away.stats,
          roster: (awayRoster || []).slice(0, 30),
        },
        venue: game.venue,
        leaders: game.leaders,
      },
    }

    if (
      user &&
      typeof idemKeyHeader === 'string' &&
      idemKeyHeader.trim().length > 0
    ) {
      await saveIdempotentResponse<GenerateParlayResponse>(
        user.uid,
        idemKeyHeader,
        response
      )
    }
    res.json(response)
  } catch {
    return errorResponse(
      res,
      500,
      'internal_error',
      'Failed to generate parlay',
      correlationId
    )
  }
}
