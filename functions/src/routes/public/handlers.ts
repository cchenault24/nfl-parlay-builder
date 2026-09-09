import express from 'express'
import { log } from '../../observability/logger'
import { getSeasonSchedule } from '../../providers/espn/client'
import { errorResponse } from '../../utils/errors'
import { REGULAR_SEASON_WEEKS, getCurrentSeason } from '../../utils/season'

type CorrelatedRequest = express.Request & { correlationId: string }

export interface WeekSummary {
  week: number
  lastKickoff: string
  allFinal: boolean
}

export interface SeasonSummary {
  season: number
  weeks: WeekSummary[]
}

// A per-week summary, not the full ~270-game schedule — this is all the
// week picker and "what's the current week" logic need, at a fraction of
// the payload size.
export const getSeasonSummaryHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const { correlationId } = req as CorrelatedRequest
  try {
    const season = getCurrentSeason()
    const games = await getSeasonSchedule(season)
    const byWeek = new Map<number, typeof games>()
    for (const game of games) {
      const list = byWeek.get(game.week) ?? []
      list.push(game)
      byWeek.set(game.week, list)
    }
    const weeks: WeekSummary[] = Array.from(byWeek.entries())
      .sort(([a], [b]) => a - b)
      .map(([week, weekGames]) => ({
        week,
        lastKickoff: weekGames.reduce(
          (latest, g) => (g.dateTime > latest ? g.dateTime : latest),
          weekGames[0].dateTime
        ),
        allFinal: weekGames.every(g => g.status === 'final'),
      }))
    const summary: SeasonSummary = { season, weeks }
    res.json(summary)
  } catch (error) {
    log.error('api.season.error', {
      correlationId,
      error: {
        code: 'schedule_error',
        message: error instanceof Error ? error.message : String(error),
      },
    })
    return errorResponse(
      res,
      502,
      'schedule_unavailable',
      'Failed to fetch NFL schedule',
      correlationId
    )
  }
}

export const getGamesForWeekHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const { correlationId } = req as CorrelatedRequest
  const week = Number(req.query.week)
  if (!Number.isInteger(week) || week < 1 || week > REGULAR_SEASON_WEEKS) {
    return errorResponse(
      res,
      400,
      'validation_error',
      `week must be an integer 1-${REGULAR_SEASON_WEEKS}`,
      correlationId
    )
  }
  try {
    const games = await getSeasonSchedule(getCurrentSeason())
    res.json(games.filter(g => g.week === week))
  } catch (error) {
    log.error('api.games.error', {
      correlationId,
      week,
      error: {
        code: 'schedule_error',
        message: error instanceof Error ? error.message : String(error),
      },
    })
    return errorResponse(
      res,
      502,
      'schedule_unavailable',
      'Failed to fetch games for week',
      correlationId
    )
  }
}
