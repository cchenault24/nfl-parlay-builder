// functions/src/http/getRateLimitStatus.ts
import type { Request, Response } from 'express'
import { onRequest } from 'firebase-functions/v2/https'

export const getRateLimitStatus = onRequest(
  {
    region: 'us-central1',
    cors: [
      'http://localhost:3001',
      'http://localhost:3000',
      'https://nfl-parlay-builder.web.app',
      'https://nfl-parlay-builder.firebaseapp.com',
    ],
  },
  async (req: Request, res: Response) => {
    // TODO: Replace with real rate limiting service
    const rateLimitInfo = {
      remaining: 95,
      total: 100,
      resetTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      currentCount: 5,
    }

    res.status(200).json({
      success: true,
      data: rateLimitInfo,
    })
  }
)
