import express from 'express'
import { handleAppleNotification, redeemAppleTransaction } from '../billing/apple'
import {
  createCheckoutSession,
  createPortalSession,
  handleStripeEvent,
  verifyStripeEvent,
} from '../billing/stripe'
import { appleConfigured, stripeConfigured } from '../billing/config'
import { verifyAuth, type AuthedRequest } from '../middleware/auth'
import { log } from '../observability/logger'
import { errorResponse } from '../utils/errors'

export const billingRouter = express.Router()

// Billing ships disabled until its secrets exist — see billing/config.ts for
// why they are not bound to the function. These guards make that a clear,
// specific answer rather than a 500 from a missing credential, and they keep
// the routes mounted so the surface is discoverable instead of a mystery 404.
const requireStripe: express.RequestHandler = (req, res, next) => {
  if (!stripeConfigured()) {
    return errorResponse(
      res,
      503,
      'billing_not_configured',
      'Card payments are not available yet.',
      (req as AuthedRequest).correlationId
    )
  }
  next()
}

const requireApple: express.RequestHandler = (req, res, next) => {
  if (!appleConfigured()) {
    return errorResponse(
      res,
      503,
      'billing_not_configured',
      'In-app purchases are not available yet.',
      (req as AuthedRequest).correlationId
    )
  }
  next()
}

type Handler = (req: AuthedRequest, res: express.Response) => Promise<unknown>

const route =
  (name: string, handler: Handler): express.RequestHandler =>
  async (req, res) => {
    const authed = req as AuthedRequest
    try {
      await handler(authed, res)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      log.error(`api.billing.${name}.error`, {
        correlationId: authed.correlationId,
        error: { code: 'billing_error', message },
      })
      if (!res.headersSent) {
        errorResponse(res, 500, 'billing_error', message, authed.correlationId)
      }
    }
  }

billingRouter.post(
  '/billing/checkout',
  verifyAuth,
  requireStripe,
  route('checkout', async (req, res) => {
    const { correlationId, user } = req
    if (!user) {
      return errorResponse(res, 401, 'unauthorized', 'Missing user', correlationId)
    }
    res.json({ url: await createCheckoutSession(user.uid, user.email) })
  })
)

billingRouter.post(
  '/billing/portal',
  verifyAuth,
  requireStripe,
  route('portal', async (req, res) => {
    const { correlationId, user } = req
    if (!user) {
      return errorResponse(res, 401, 'unauthorized', 'Missing user', correlationId)
    }
    res.json({ url: await createPortalSession(user.uid) })
  })
)

// The app posts the signed transaction StoreKit handed it. The signature is
// what grants Pro — the client's own claim to have purchased is not evidence.
billingRouter.post(
  '/billing/apple/redeem',
  verifyAuth,
  requireApple,
  route('apple_redeem', async (req, res) => {
    const { correlationId, user } = req
    if (!user) {
      return errorResponse(res, 401, 'unauthorized', 'Missing user', correlationId)
    }
    // Checked as a string rather than coerced: String({}) is "[object Object]",
    // which is truthy, so a non-string body would sail past this guard and reach
    // the verifier as gibberish.
    const signedTransaction = req.body?.signedTransaction
    if (typeof signedTransaction !== 'string' || !signedTransaction) {
      return errorResponse(
        res,
        400,
        'validation_error',
        'signedTransaction is required',
        correlationId
      )
    }
    try {
      res.json(await redeemAppleTransaction(user.uid, signedTransaction))
    } catch (e) {
      // A transaction that will not verify is the client's problem, not a
      // server fault, so it must not read as a 500 the app might retry.
      log.warn('api.billing.apple_redeem.invalid', {
        correlationId,
        error: {
          code: 'invalid_transaction',
          message: e instanceof Error ? e.message : String(e),
        },
      })
      errorResponse(
        res,
        400,
        'invalid_transaction',
        'That App Store transaction could not be verified',
        correlationId
      )
    }
  })
)

// Both webhooks are unauthenticated by necessity — the caller is Stripe or
// Apple, not a signed-in user — so the signature is the only thing standing
// between a POST and a granted subscription. Neither handler trusts a byte
// before it verifies.

billingRouter.post('/billing/webhooks/stripe', requireStripe, async (req, res) => {
  const correlationId = (req as AuthedRequest).correlationId
  const signature = req.headers['stripe-signature']
  if (typeof signature !== 'string') {
    return errorResponse(
      res,
      400,
      'missing_signature',
      'Missing stripe-signature header',
      correlationId
    )
  }
  let event
  try {
    // req.body is a Buffer here, not parsed JSON — see the express.raw mount in
    // index.ts. Re-serializing a parsed body changes the bytes and the
    // signature stops matching.
    event = verifyStripeEvent(req.body as Buffer, signature)
  } catch (e) {
    log.warn('api.billing.stripe_webhook.bad_signature', {
      correlationId,
      error: {
        code: 'bad_signature',
        message: e instanceof Error ? e.message : String(e),
      },
    })
    return errorResponse(
      res,
      400,
      'bad_signature',
      'Signature verification failed',
      correlationId
    )
  }

  try {
    await handleStripeEvent(event)
  } catch (e) {
    // Returning 500 makes Stripe retry, which is what we want for a transient
    // Firestore failure — the event is still valid and still needs applying.
    log.error('api.billing.stripe_webhook.handler_failed', {
      correlationId,
      error: {
        code: 'handler_failed',
        message: e instanceof Error ? e.message : String(e),
      },
    })
    return errorResponse(res, 500, 'handler_failed', 'Event handling failed', correlationId)
  }
  res.json({ received: true })
})

// Apple posts { signedPayload }; the signature lives inside the JWS, so normal
// JSON parsing is fine here and no raw body is needed.
billingRouter.post('/billing/webhooks/apple', requireApple, async (req, res) => {
  const correlationId = (req as AuthedRequest).correlationId
  const signedPayload = String(req.body?.signedPayload ?? '')
  if (!signedPayload) {
    return errorResponse(
      res,
      400,
      'validation_error',
      'signedPayload is required',
      correlationId
    )
  }
  try {
    await handleAppleNotification(signedPayload)
  } catch (e) {
    log.error('api.billing.apple_webhook.failed', {
      correlationId,
      error: {
        code: 'handler_failed',
        message: e instanceof Error ? e.message : String(e),
      },
    })
    // Apple retries for days on a non-2xx, which is the behaviour we want for a
    // transient failure and harmless for a forged payload that will never pass.
    return errorResponse(res, 500, 'handler_failed', 'Notification handling failed', correlationId)
  }
  res.json({ received: true })
})
