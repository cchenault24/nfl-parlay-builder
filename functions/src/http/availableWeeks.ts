import type { Request, Response } from 'express'
import { onRequest } from 'firebase-functions/v2/https'

export const availableWeeks = onRequest(
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
    // TODO: Replace with real ESPN service call
    const fallbackWeek = 3
    const current = Number.isFinite(
      parseInt(process.env.MOCK_CURRENT_WEEK ?? '', 10)
    )
      ? parseInt(process.env.MOCK_CURRENT_WEEK as string, 10)
      : fallbackWeek

    const maxWeek = 18
    const start = Math.min(Math.max(current, 1), maxWeek)
    const weeks = Array.from(
      { length: maxWeek - start + 1 },
      (_, i) => start + i
    )

    res.status(200).json({
      success: true,
      data: weeks,
    })
  }
)
