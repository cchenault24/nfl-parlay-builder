import express from 'express'
import { verifyAuth } from '../../middleware/auth'
import { rateLimitByUser } from '../../middleware/rateLimit'
import { generateParlayHandler } from './handlers'

export const protectedRouter = express.Router()

protectedRouter.post(
  '/parlays/generate',
  verifyAuth,
  rateLimitByUser(10, 30 * 60_000),
  generateParlayHandler
)
