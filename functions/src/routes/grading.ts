import express from 'express'
import { gradeParlayDocs } from '../grading/sweep'
import { verifyAuth, type AuthedRequest } from '../middleware/auth'
import { rateLimitByUser } from '../middleware/rateLimit'
import { log } from '../observability/logger'
import { errorResponse } from '../utils/errors'
import { db } from '../firebase'

export const gradingRouter = express.Router()

const GRADE_ROUTE = 'parlays_grade'

// Grades every one of the caller's saved parlays that isn't already graded.
// The scheduled sweep does the same across all users; this exists so a user
// who opens their history sees fresh results without waiting for the next run.
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

      const { checked, graded } = await gradeParlayDocs(snap.docs)

      res.json({ ok: true, checked, graded })
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
