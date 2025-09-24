import type { Request, Response } from 'express'
import { onRequest } from 'firebase-functions/v2/https'
import { applyCors, handlePreflight } from './cors'

export const availableWeek = onRequest(
  { region: 'us-central1' },
  async (req: Request, res: Response) => {
    if (handlePreflight(req, res)) return
    applyCors(res)

    const current = Number(process.env.MOCK_CURRENT_WEEK ?? 3)
    const weeks = Array.from(
      { length: 18 - current + 1 },
      (_, i) => current + i
    )

    res.status(200).json({
      success: true,
      data: weeks,
    })
  }
)
