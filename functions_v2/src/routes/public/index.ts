import express from 'express'
import { rateLimitByIp } from '../../middleware/rateLimit'
import { getCurrentWeekHandler, getGamesHandler } from './handlers'

export const publicRouter = express.Router()

publicRouter.get(
  '/weeks/current',
  rateLimitByIp(120, 60_000),
  getCurrentWeekHandler
)

publicRouter.get('/games', rateLimitByIp(120, 60_000), getGamesHandler)
