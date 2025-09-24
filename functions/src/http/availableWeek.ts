import type { Request, Response } from 'express'
import { onRequest } from 'firebase-functions/v2/https'
import { handleWithCors } from './cors'

export const availableWeeks = onRequest(
  { region: 'us-central1' },
  handleWithCors(async (req: Request, res: Response) => {
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

    // optional: help the browser cache very short-lived responses during dev
    res.setHeader('Cache-Control', 'private, max-age=30')

    res.status(200).json({ success: true, data: weeks })
  })
)
