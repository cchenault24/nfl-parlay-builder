import express from 'express'
import { rateLimitByIp } from '../../middleware/rateLimit'
import { getGamesForWeekHandler, getSeasonSummaryHandler } from './handlers'

export const publicRouter = express.Router()

publicRouter.get(
  '/season',
  rateLimitByIp(60, 60_000, 'public_season'),
  getSeasonSummaryHandler
)
publicRouter.get(
  '/games',
  rateLimitByIp(60, 60_000, 'public_games'),
  getGamesForWeekHandler
)
