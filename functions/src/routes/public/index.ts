import express from 'express'
import { rateLimitByIp } from '../../middleware/rateLimit'
import { getGamesForWeekHandler, getScheduleHandler } from './handlers'

export const publicRouter = express.Router()

publicRouter.get('/schedule', rateLimitByIp(60, 60_000), getScheduleHandler)
publicRouter.get('/games', rateLimitByIp(60, 60_000), getGamesForWeekHandler)
