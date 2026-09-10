import express from 'express'
import { auth, db } from '../firebase'
import { verifyAuth, type AuthedRequest } from '../middleware/auth'
import { log } from '../observability/logger'
import { getEntitlement } from '../tiering/store'
import { errorResponse } from '../utils/errors'

export const accountRouter = express.Router()

// Collections keyed by uid. Everything else the user touches is either found by
// a userId query below or deliberately kept — see the note on sharedParlays.
const BY_UID = ['users', 'entitlements', 'quotas'] as const

// Deletes everything the caller owns, then the Auth user itself.
//
// Guideline 5.1.1(v) requires an app that offers account creation to offer
// account deletion inside the app, so this is not optional for the iOS build.
//
// `sharedParlays` is deliberately untouched. A share link is already an
// independent copy that never carried the owner's uid (routes/sharing.ts builds
// it field by field for exactly that reason), so leaving it alone keeps a link
// someone handed a friend working without retaining anything personal.
//
// `rate_limits` is also left alone: its document id is a sha256 of the key, so
// it holds no readable identifier, only a count and a window that ages out.
// Deleting it would mean hardcoding a registry of every route name and window,
// which would drift the moment someone adds a limiter.
accountRouter.delete(
  '/account',
  verifyAuth,
  async (req: express.Request, res: express.Response) => {
    const { correlationId, user } = req as AuthedRequest
    if (!user) {
      return errorResponse(res, 401, 'unauthorized', 'Missing user', correlationId)
    }
    const uid = user.uid

    try {
      // Neither store cancels a subscription because an account disappeared, so
      // deleting now would leave someone paying for an account that no longer
      // exists. getEntitlement already demotes an expired one on read, so this
      // only catches a genuinely live subscription.
      const entitlement = await getEntitlement(uid)
      if (entitlement.tier === 'pro') {
        return errorResponse(
          res,
          409,
          'subscription_active',
          entitlement.source === 'iap'
            ? 'Cancel your Pro subscription first, in Settings > your name > Subscriptions on your iPhone. Once it has ended you can delete your account.'
            : 'Cancel your Pro subscription first, from Manage billing. Once it has ended you can delete your account.',
          correlationId,
          { source: entitlement.source }
        )
      }

      // Data first, Auth last: a failure part way through leaves the user signed
      // in and able to retry, rather than locked out of their own leftovers.
      const parlays = await db().collection('parlays').where('userId', '==', uid).get()
      const writer = db().bulkWriter()
      for (const doc of parlays.docs) {
        writer.delete(doc.ref)
      }
      for (const name of BY_UID) {
        writer.delete(db().collection(name).doc(uid))
      }
      await writer.close()

      // Runs carry a `steps` subcollection, which a plain delete would orphan.
      const runs = await db().collection('agentRuns').where('userId', '==', uid).get()
      for (const doc of runs.docs) {
        await db().recursiveDelete(doc.ref)
      }

      await auth().deleteUser(uid)

      log.info('api.account.deleted', {
        correlationId,
        parlays: parlays.size,
        runs: runs.size,
      })
      res.json({ deleted: { parlays: parlays.size, agentRuns: runs.size } })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      log.error('api.account.delete_failed', {
        correlationId,
        error: { code: 'account_delete_failed', message },
      })
      errorResponse(
        res,
        500,
        'account_delete_failed',
        'Could not delete your account. Nothing has been removed — please try again.',
        correlationId
      )
    }
  }
)
