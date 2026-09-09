import express from 'express'
import { combineParlayOutcome, gradeLeg, type GradableLeg } from '../grading/gradeLeg'
import type { ParlayGrading } from '../grading/types'
import { verifyAuth, type AuthedRequest } from '../middleware/auth'
import { rateLimitByUser } from '../middleware/rateLimit'
import { log } from '../observability/logger'
import { getBoxScore, getGame } from '../providers/espn/client'
import { errorResponse } from '../utils/errors'
import { getSeasonForDate } from '../utils/season'
import { db } from '../firebase'

export const gradingRouter = express.Router()

const GRADE_ROUTE = 'parlays_grade'

interface StoredParlay {
  userId?: string
  gameId?: string
  gameDateTime?: string
  legs?: GradableLeg[]
  grading?: ParlayGrading
}

// Grades every one of the caller's saved parlays that isn't already graded.
// A parlay whose game isn't final yet is marked 'pending' and re-checked the
// next time this is called; a final result is permanent once graded.
gradingRouter.post(
  '/parlays/grade',
  verifyAuth,
  rateLimitByUser(10, 60 * 60_000, GRADE_ROUTE),
  async (req: express.Request, res: express.Response) => {
    const { correlationId, user } = req as AuthedRequest
    if (!user) {
      return errorResponse(res, 401, 'unauthorized', 'Missing user', correlationId)
    }
    try {
      const snap = await db()
        .collection('parlays')
        .where('userId', '==', user.uid)
        .get()

      let graded = 0
      for (const doc of snap.docs) {
        const data = doc.data() as StoredParlay
        if (data.grading?.status === 'graded') {
          continue
        }
        if (!data.gameId || !data.gameDateTime || !Array.isArray(data.legs)) {
          continue
        }

        const season = getSeasonForDate(new Date(data.gameDateTime))
        const game = await getGame(season, data.gameId)
        if (!game) {
          continue
        }
        if (game.status !== 'final' || game.homeScore === null || game.awayScore === null) {
          await doc.ref.set(
            { grading: { status: 'pending' } satisfies ParlayGrading },
            { merge: true }
          )
          continue
        }

        const box = await getBoxScore(data.gameId)
        const gameResult = {
          homeTeamName: game.home.name,
          awayTeamName: game.away.name,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
        }
        const legOutcomes = data.legs.map(leg => gradeLeg(leg, gameResult, box))
        const parlayOutcome = combineParlayOutcome(legOutcomes)
        const grading: ParlayGrading = {
          status: 'graded',
          gradedAt: new Date().toISOString(),
          legOutcomes,
          parlayOutcome,
        }
        await doc.ref.set({ grading }, { merge: true })
        graded++
      }

      res.json({ ok: true, checked: snap.size, graded })
    } catch (error) {
      log.error('api.grading.error', {
        correlationId,
        error: {
          code: 'grading_error',
          message: error instanceof Error ? error.message : String(error),
        },
      })
      return errorResponse(
        res,
        500,
        'grading_error',
        'Failed to grade parlays',
        correlationId
      )
    }
  }
)
