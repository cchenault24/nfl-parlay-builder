import type { Request, Response } from 'express'
import { onRequest } from 'firebase-functions/v2/https'
import { applyCors, handlePreflight } from './cors'

export const currentWeek = onRequest(
  { region: 'us-central1' },
  async (req: Request, res: Response) => {
    if (handlePreflight(req, res)) return
    applyCors(res)

    // TODO: replace with real data service
    const week = Number(process.env.MOCK_CURRENT_WEEK ?? 3)

    res.status(200).json({
      success: true,
      data: week,
    })
  }
)
