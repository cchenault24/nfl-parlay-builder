import express from 'express'
import { rateLimitByIp } from '../../middleware/rateLimit'
import {
  getGamesHandler,
  getNFLWeeksHandler,
  getPFRDataForTeamsHandler,
  getPFRGameHandler,
  getPFRScheduleHandler,
} from './handlers'

export const publicRouter = express.Router()

publicRouter.get(
  '/weeks/current',
  rateLimitByIp(120, 60_000),
  getNFLWeeksHandler
)

publicRouter.get('/games', rateLimitByIp(120, 60_000), getGamesHandler)

publicRouter.get('/pfr-game', rateLimitByIp(30, 60_000), getPFRGameHandler)

publicRouter.post(
  '/pfr-teams',
  rateLimitByIp(30, 60_000),
  getPFRDataForTeamsHandler
)

publicRouter.get(
  '/pfr-schedule',
  rateLimitByIp(30, 60_000),
  getPFRScheduleHandler
)
