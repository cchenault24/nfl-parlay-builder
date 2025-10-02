import express from 'express'
import {
  fetchCurrentWeek as espnCurrentWeek,
  fetchGamesForWeek,
} from '../../providers/espn'
import { getCached, setCached } from '../../utils/cache'
import { errorResponse } from '../../utils/errors'
import { GamesResponse } from './schema'

// Extended request type with correlation ID
interface CorrelatedRequest extends express.Request {
  correlationId: string
}

const CACHE_TTL_MS = 10 * 60 * 1000

export const getCurrentWeekHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const correlatedReq = req as CorrelatedRequest
  const correlationId = correlatedReq.correlationId
  try {
    const cacheKey = 'espn:weeks:current'
    const cached = await getCached<number>(cacheKey, CACHE_TTL_MS)
    if (cached !== null) {
      return res.json({ week: cached })
    }
    const week = await espnCurrentWeek()
    await setCached(cacheKey, week)
    res.json({ week })
  } catch {
    return errorResponse(
      res,
      500,
      'internal_error',
      'Failed to fetch current week',
      correlationId
    )
  }
}

export const getGamesHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const correlatedReq = req as CorrelatedRequest
  const correlationId = correlatedReq.correlationId
  const weekStr = req.query.week as string | undefined
  if (!weekStr) {
    return errorResponse(
      res,
      400,
      'validation_error',
      'Missing query param: week',
      correlationId
    )
  }
  const week = Number(weekStr)
  if (!Number.isInteger(week) || week <= 0) {
    return errorResponse(
      res,
      400,
      'validation_error',
      'Invalid week',
      correlationId
    )
  }
  try {
    const cacheKey = `espn:games:week:${week}`
    const cached = await getCached<GamesResponse[]>(cacheKey, CACHE_TTL_MS)
    if (cached) {
      return res.json(cached)
    }
    const games = await fetchGamesForWeek(week)
    await setCached(cacheKey, games)
    res.json(games)
  } catch {
    return errorResponse(
      res,
      500,
      'internal_error',
      'Failed to fetch games',
      correlationId
    )
  }
}
