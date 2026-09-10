import { randomUUID } from 'node:crypto'
import express from 'express'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../firebase'
import { verifyAuth, type AuthedRequest } from '../middleware/auth'
import { rateLimitByIp, rateLimitByUser } from '../middleware/rateLimit'
import { log } from '../observability/logger'
import { errorResponse } from '../utils/errors'

export const sharingRouter = express.Router()

// A shared parlay is copied into its own collection rather than the original
// being opened up, so the public document can be built field by field. The
// owner's uid never appears in it, and no rule change can accidentally widen
// what a link exposes.
const SHARED = 'sharedParlays'

interface OwnedParlay {
  userId?: string
  shareId?: string
  [key: string]: unknown
}

function publicView(parlay: OwnedParlay, shareId: string) {
  return {
    shareId,
    gameContext: parlay.gameContext ?? '',
    week: parlay.week ?? null,
    gameDateTime: parlay.gameDateTime ?? null,
    legs: parlay.legs ?? [],
    combinedOdds: parlay.combinedOdds ?? null,
    parlayConfidence: parlay.parlayConfidence ?? null,
    gameSummary: parlay.gameSummary ?? null,
    model: parlay.model ?? null,
    grading: parlay.grading ?? null,
    closingLines: parlay.closingLines ?? null,
    sharedAt: new Date().toISOString(),
  }
}

// Mints a link for one of the caller's own parlays. Sharing the same parlay
// twice returns the existing link rather than orphaning the first one.
sharingRouter.post(
  '/parlays/:id/share',
  verifyAuth,
  rateLimitByUser(30, 60 * 60_000, 'parlay_share'),
  async (req: express.Request, res: express.Response) => {
    const { correlationId, user } = req as AuthedRequest
    if (!user) {
      return errorResponse(res, 401, 'unauthorized', 'Missing user', correlationId)
    }
    try {
      const ref = db().collection('parlays').doc(req.params.id)
      const snap = await ref.get()
      const parlay = snap.data() as OwnedParlay | undefined
      if (!snap.exists || parlay?.userId !== user.uid) {
        return errorResponse(res, 404, 'not_found', 'Parlay not found', correlationId)
      }
      if (parlay.shareId) {
        return res.json({ shareId: parlay.shareId })
      }
      const shareId = randomUUID()
      await db().collection(SHARED).doc(shareId).set(publicView(parlay, shareId))
      await ref.set({ shareId }, { merge: true })
      res.json({ shareId })
    } catch (error) {
      log.error('api.share.error', {
        correlationId,
        error: {
          code: 'share_error',
          message: error instanceof Error ? error.message : String(error),
        },
      })
      return errorResponse(res, 500, 'share_error', 'Failed to share parlay', correlationId)
    }
  }
)

// Revokes a link. The copy is deleted outright, so the URL stops resolving.
sharingRouter.delete(
  '/parlays/:id/share',
  verifyAuth,
  rateLimitByUser(30, 60 * 60_000, 'parlay_unshare'),
  async (req: express.Request, res: express.Response) => {
    const { correlationId, user } = req as AuthedRequest
    if (!user) {
      return errorResponse(res, 401, 'unauthorized', 'Missing user', correlationId)
    }
    try {
      const ref = db().collection('parlays').doc(req.params.id)
      const snap = await ref.get()
      const parlay = snap.data() as OwnedParlay | undefined
      if (!snap.exists || parlay?.userId !== user.uid) {
        return errorResponse(res, 404, 'not_found', 'Parlay not found', correlationId)
      }
      if (parlay.shareId) {
        await db().collection(SHARED).doc(parlay.shareId).delete()
        await ref.update({ shareId: FieldValue.delete() })
      }
      res.json({ ok: true })
    } catch (error) {
      log.error('api.unshare.error', {
        correlationId,
        error: {
          code: 'unshare_error',
          message: error instanceof Error ? error.message : String(error),
        },
      })
      return errorResponse(res, 500, 'unshare_error', 'Failed to stop sharing', correlationId)
    }
  }
)

// The public read. Unauthenticated by design — holding the link is the
// permission — and served from the sanitized copy, never the owner's doc.
sharingRouter.get(
  '/shared/:shareId',
  rateLimitByIp(60, 60_000, 'shared_read'),
  async (req: express.Request, res: express.Response) => {
    const { correlationId } = req as AuthedRequest
    try {
      const snap = await db().collection(SHARED).doc(req.params.shareId).get()
      if (!snap.exists) {
        return errorResponse(res, 404, 'not_found', 'This parlay is not shared', correlationId)
      }
      res.json(snap.data())
    } catch (error) {
      log.error('api.shared.error', {
        correlationId,
        error: {
          code: 'shared_error',
          message: error instanceof Error ? error.message : String(error),
        },
      })
      return errorResponse(res, 500, 'shared_error', 'Failed to load parlay', correlationId)
    }
  }
)
