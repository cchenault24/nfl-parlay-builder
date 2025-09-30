import express from 'express'
import {
  fetchCurrentWeek,
  fetchGamesForWeek,
  fetchTeamRoster,
  type GameItem,
} from '../../providers/espn'
import { generateParlayWithAI } from '../../service/ai'
import {
  getIdempotentResponse,
  saveIdempotentResponse,
} from '../../storage/idempotency'
import { getCached, setCached } from '../../utils/cache'
import { errorResponse } from '../../utils/errors'
import {
  GenerateParlayRequestSchema,
  type GenerateParlayResponse,
} from './schema'

export const generateParlayHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const correlationId = (req as any).correlationId as string
  try {
    const user = (req as any).user as { uid: string } | undefined
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

    // Fetch real game data from ESPN with caching
    // Use provided week if available; otherwise use current week
    let targetWeek = week ?? (await fetchCurrentWeek())

    // Try to find the game in the current week first
    const cacheKey = `games_week_${targetWeek}`
    let games = await getCached<GameItem[]>(cacheKey, 10 * 60 * 1000) // 10 minute TTL
    if (!games) {
      games = await fetchGamesForWeek(targetWeek)
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

        const weekCacheKey = `games_week_${w}`
        let weekGames = await getCached<GameItem[]>(
          weekCacheKey,
          10 * 60 * 1000
        )
        if (!weekGames) {
          weekGames = await fetchGamesForWeek(w)
          await setCached(weekCacheKey, weekGames)
        }

        if (weekGames.find(g => g.gameId === gameId)) {
          games = weekGames
          targetWeek = w
          break
        }
      }
    }

    const game = games.find(g => g.gameId === gameId)

    if (!game) {
      console.error('Game not found:', {
        requestedGameId: gameId,
        availableGameIds: games.map(g => g.gameId),
        targetWeek,
        totalGames: games.length,
      })
      return errorResponse(
        res,
        404,
        'game_not_found',
        `Game with ID ${gameId} not found`,
        correlationId
      )
    }

    // Generate parlay with AI using real game data
    const ai = process.env.OPENAI_API_KEY
      ? await generateParlayWithAI({
          gameId,
          riskLevel: parsed.data.riskLevel,
          gameData: game,
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
    const homeRosterCacheKey = `roster_${game.home.teamId}`
    const awayRosterCacheKey = `roster_${game.away.teamId}`
    const rosterTtl = 10 * 60 * 1000
    let homeRoster = await getCached<{ playerId: string; name: string }[]>(
      homeRosterCacheKey,
      rosterTtl
    )
    if (!homeRoster) {
      homeRoster = await fetchTeamRoster(game.home.teamId)
      await setCached(homeRosterCacheKey, homeRoster)
    }
    let awayRoster = await getCached<{ playerId: string; name: string }[]>(
      awayRosterCacheKey,
      rosterTtl
    )
    if (!awayRoster) {
      awayRoster = await fetchTeamRoster(game.away.teamId)
      await setCached(awayRosterCacheKey, awayRoster)
    }

    const response: GenerateParlayResponse = {
      parlayId: `pl_${Math.random().toString(36).slice(2, 10)}`,
      gameId,
      gameContext: `${game.away.name} @ ${game.home.name} - Week ${game.week}`,
      legs: ai.legs,
      combinedOdds: ai.legs.reduce((acc, leg) => {
        // Convert American odds to decimal, multiply, convert back
        const decimal =
          leg.odds > 0 ? leg.odds / 100 + 1 : 100 / Math.abs(leg.odds) + 1
        return acc * decimal
      }, 1),
      parlayConfidence: Math.max(...ai.legs.map(l => l.confidence)),
      gameSummary: ai.analysisSummary,
      rosterDataUsed: {
        home: homeRoster.slice(0, 30),
        away: awayRoster.slice(0, 30),
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
