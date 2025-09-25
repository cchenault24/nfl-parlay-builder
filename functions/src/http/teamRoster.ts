// functions/src/http/teamRoster.ts
import type { Request, Response } from 'express'
import { onRequest } from 'firebase-functions/v2/https'

export const teamRoster = onRequest(
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
    const teamId = req.query.teamId as string

    if (!teamId) {
      res.status(400).json({
        success: false,
        error: 'teamId parameter is required',
      })
      return
    }

    // TODO: Replace with real ESPN service call
    const mockPlayers = [
      {
        id: `player_${teamId}_1`,
        fullName: 'Patrick Mahomes',
        shortName: 'P. Mahomes',
        position: {
          abbreviation: 'QB',
          displayName: 'Quarterback',
        },
        teamId,
        status: 'active' as const,
      },
      {
        id: `player_${teamId}_2`,
        fullName: 'Travis Kelce',
        shortName: 'T. Kelce',
        position: {
          abbreviation: 'TE',
          displayName: 'Tight End',
        },
        teamId,
        status: 'active' as const,
      },
    ]

    res.status(200).json({
      success: true,
      data: mockPlayers,
    })
  }
)
