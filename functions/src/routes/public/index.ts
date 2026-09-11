import express from 'express'
import { rateLimitByIp } from '../../middleware/rateLimit'
import {
  getGameStatsHandler,
  getGamesForWeekHandler,
  getSeasonSummaryHandler,
  getWeekOddsHandler,
} from './handlers'

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
publicRouter.get(
  '/odds/week/:week',
  rateLimitByIp(60, 60_000, 'public_odds_week'),
  getWeekOddsHandler
)
publicRouter.get(
  '/games/:gameId/stats',
  rateLimitByIp(60, 60_000, 'public_game_stats'),
  getGameStatsHandler
)
