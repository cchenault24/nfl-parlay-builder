import express from 'express'
import { log } from '../../observability/logger'
import { getSeasonSchedule } from '../../providers/espn/client'
import { errorResponse } from '../../utils/errors'
import { REGULAR_SEASON_WEEKS, getCurrentSeason } from '../../utils/season'

type CorrelatedRequest = express.Request & { correlationId: string }

export const getScheduleHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const { correlationId } = req as CorrelatedRequest
  try {
    res.json(await getSeasonSchedule(getCurrentSeason()))
  } catch (error) {
    log.error('api.schedule.error', {
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
