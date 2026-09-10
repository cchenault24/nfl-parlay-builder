import express from 'express'
import { verifyAuth, type AuthedRequest } from '../middleware/auth'
import { log } from '../observability/logger'
import { getEntitlementView } from '../tiering/store'
import { errorResponse } from '../utils/errors'

export const entitlementsRouter = express.Router()

// The only way a client learns its tier, its limits and its quota. Clients
// never hardcode a limit, so changing one is a server-side change alone.
entitlementsRouter.get(
  '/entitlements',
  verifyAuth,
  async (req: express.Request, res: express.Response) => {
    const { correlationId, user } = req as AuthedRequest
    if (!user) {
      return errorResponse(res, 401, 'unauthorized', 'Missing user', correlationId)
    }
    try {
      res.json(await getEntitlementView(user.uid))
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      log.error('api.entitlements.error', {
        correlationId,
        error: { code: 'entitlements_unavailable', message },
      })
      errorResponse(
        res,
        503,
        'entitlements_unavailable',
        'Entitlements are temporarily unavailable',
        correlationId
      )
    }
  }
)
