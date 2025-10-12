import express from 'express'
import { verifyAuth } from '../../middleware/auth'
import { rateLimitByUser } from '../../middleware/rateLimit'
import { generateParlayHandler } from './handlers'

export const protectedRouter = express.Router()

protectedRouter.post(
  '/parlays/generate',
  verifyAuth,
  rateLimitByUser(20, 60 * 60_000), // 20 requests per hour (60 minutes)
  generateParlayHandler
)
