// functions/src/http/generateParlay.ts - Updated for POST endpoint
import type { Request, Response } from 'express'
import { onRequest } from 'firebase-functions/v2/https'

export const generateParlay = onRequest(
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
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed. Use POST.',
      })
      return
    }

    const { game, options } = req.body

    if (!game?.id) {
      res.status(400).json({
        success: false,
        error: 'Game object with id is required',
      })
      return
    }

    // TODO: Replace with real AI parlay generation service
    const mockParlay = {
      id: `parlay_${Date.now()}`,
      gameId: game.id,
      legs: [
        {
          id: 'leg_1',
          betType: 'spread' as const,
          selection: game.homeTeam?.displayName || 'Home Team',
          target: '-3.5',
          reasoning:
            'Strong home field advantage and recent offensive performance',
          confidence: 7,
          odds: '-110',
        },
        {
          id: 'leg_2',
          betType: 'total' as const,
          selection: 'Over',
          target: '47.5',
          reasoning: 'Both teams have potent passing attacks',
          confidence: 6,
          odds: '-105',
        },
      ],
      aiReasoning:
        'This parlay leverages home field advantage and offensive matchups...',
      overallConfidence: 6.5,
      estimatedOdds: '+260',
      createdAt: new Date().toISOString(),
    }

    res.status(200).json({
      success: true,
      data: mockParlay,
    })
  }
)
