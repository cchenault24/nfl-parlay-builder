// functions/src/http/gamesByWeek.ts
import type { Request, Response } from 'express'
import { onRequest } from 'firebase-functions/v2/https'

export const gamesByWeek = onRequest(
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
    const week = parseInt(req.query.week as string, 10)

    if (!week || week < 1 || week > 18) {
      res.status(400).json({
        success: false,
        error: 'Invalid week parameter. Must be between 1 and 18.',
      })
      return
    }

    // TODO: Replace with real ESPN service call
    const mockGames = [
      {
        id: `game_${week}_1`,
        season: 2024,
        week,
        date: new Date().toISOString(),
        status: 'scheduled' as const,
        homeTeam: {
          id: 'team_1',
          abbreviation: 'KC',
          displayName: 'Kansas City Chiefs',
          shortDisplayName: 'Chiefs',
        },
        awayTeam: {
          id: 'team_2',
          abbreviation: 'BUF',
          displayName: 'Buffalo Bills',
          shortDisplayName: 'Bills',
        },
        venue: {
          name: 'Arrowhead Stadium',
          city: 'Kansas City',
          state: 'MO',
        },
      },
    ]

    res.status(200).json({
      success: true,
      data: mockGames,
    })
  }
)
