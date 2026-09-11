import express from 'express'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// The route's job is to map outcomes onto status codes, so everything below it
// is stubbed and every assertion is about the code the app receives. Getting
// this mapping wrong is not cosmetic: the client retries 5xx and does not retry
// 4xx, so a verification failure filed as a 500 turns one bad transaction into
// a retry loop.

const redeemAppleTransaction = vi.fn()
const handleAppleNotification = vi.fn()
vi.mock('../billing/apple', () => ({
  redeemAppleTransaction: (...args: unknown[]) => redeemAppleTransaction(...args),
  handleAppleNotification: (...args: unknown[]) => handleAppleNotification(...args),
}))

const createCheckoutSession = vi.fn()
vi.mock('../billing/stripe', () => ({
  createCheckoutSession: (...args: unknown[]) => createCheckoutSession(...args),
  createPortalSession: vi.fn(),
  handleStripeEvent: vi.fn(),
  verifyStripeEvent: vi.fn(),
}))

let appleOn = true
let stripeOn = false
vi.mock('../billing/config', () => ({
  appleConfigured: () => appleOn,
  stripeConfigured: () => stripeOn,
}))

// Bearer "good" is a valid session; anything else is not. That is the whole
// contract this route depends on.
vi.mock('../middleware/auth', () => ({
  verifyAuth: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const authed = req as express.Request & {
      correlationId: string
      user?: { uid: string }
    }
    authed.correlationId = 'test-correlation'
    if (req.headers.authorization === 'Bearer good') {
      authed.user = { uid: 'uid-1' }
      return next()
    }
    if (req.headers.authorization === 'Bearer no-user') {
      // Middleware passed but attached nobody — the case the handler's own 401
      // guard exists for.
      return next()
    }
    return res.status(401).json({ code: 'unauthorized', status: 401 })
  },
}))

vi.mock('../observability/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { billingRouter } = await import('./billing')

const app = express()
app.use(express.json())
app.use(billingRouter)
// Port 0 asks the OS for a free port, so concurrent runs of this file cannot
// collide on a fixed one.
const server = app.listen(0)
const port = (server.address() as AddressInfo).port

afterAll(() => {
  server.close()
})

async function redeem(body: unknown, authorization = 'Bearer good') {
  const res = await fetch(`http://127.0.0.1:${port}/billing/apple/redeem`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json() }
}

beforeEach(() => {
  vi.clearAllMocks()
  appleOn = true
  stripeOn = false
})

describe('POST /billing/apple/redeem', () => {
  it('returns the grant on success', async () => {
    redeemAppleTransaction.mockResolvedValue({
      tier: 'pro',
      accessEndsAt: '2026-10-01T00:00:00.000Z',
    })

    const res = await redeem({ signedTransaction: 'jws' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ tier: 'pro', accessEndsAt: '2026-10-01T00:00:00.000Z' })
    expect(redeemAppleTransaction).toHaveBeenCalledWith('uid-1', 'jws')
  })

  it('rejects an unauthenticated request', async () => {
    const res = await redeem({ signedTransaction: 'jws' }, 'Bearer bad')

    expect(res.status).toBe(401)
    expect(redeemAppleTransaction).not.toHaveBeenCalled()
  })

  it('rejects a request the middleware let through with no user', async () => {
    const res = await redeem({ signedTransaction: 'jws' }, 'Bearer no-user')

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('unauthorized')
    expect(redeemAppleTransaction).not.toHaveBeenCalled()
  })

  it('answers 503 while Apple billing has no credentials', async () => {
    appleOn = false

    const res = await redeem({ signedTransaction: 'jws' })

    expect(res.status).toBe(503)
    expect(res.body.code).toBe('billing_not_configured')
    expect(redeemAppleTransaction).not.toHaveBeenCalled()
  })

  it('rejects a missing signedTransaction', async () => {
    const res = await redeem({})

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('validation_error')
    expect(redeemAppleTransaction).not.toHaveBeenCalled()
  })

  it('rejects an empty signedTransaction', async () => {
    const res = await redeem({ signedTransaction: '' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('validation_error')
  })

  // String({}) is "[object Object]" — truthy — so a coercing guard would pass
  // this through to the verifier as gibberish instead of refusing it here.
  it('rejects a non-string signedTransaction rather than coercing it', async () => {
    const res = await redeem({ signedTransaction: { nested: 'value' } })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('validation_error')
    expect(redeemAppleTransaction).not.toHaveBeenCalled()
  })

  // The client does not retry a 4xx and does retry a 5xx. A transaction that
  // will never verify must therefore not be filed as a server fault.
  it('answers 400, not 500, when the transaction will not verify', async () => {
    redeemAppleTransaction.mockRejectedValue(new Error('bad signature'))

    const res = await redeem({ signedTransaction: 'jws' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('invalid_transaction')
  })

  it('does not leak the underlying failure message to the client', async () => {
    redeemAppleTransaction.mockRejectedValue(
      new Error('APPLE_APP_APPLE_ID is not configured')
    )

    const res = await redeem({ signedTransaction: 'jws' })

    expect(res.body.message).not.toContain('APPLE_APP_APPLE_ID')
  })

  it('answers 400 when the transaction belongs to another account', async () => {
    redeemAppleTransaction.mockRejectedValue(
      new Error('That subscription is already attached to a different account.')
    )

    const res = await redeem({ signedTransaction: 'jws' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('invalid_transaction')
  })
})

describe('POST /billing/webhooks/apple', () => {
  async function notify(body: unknown) {
    const res = await fetch(`http://127.0.0.1:${port}/billing/webhooks/apple`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { status: res.status, body: await res.json() }
  }

  it('accepts a well-formed notification', async () => {
    handleAppleNotification.mockResolvedValue(undefined)

    const res = await notify({ signedPayload: 'signed' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ received: true })
    expect(handleAppleNotification).toHaveBeenCalledWith('signed')
  })

  it('rejects a notification with no payload', async () => {
    const res = await notify({})

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('validation_error')
    expect(handleAppleNotification).not.toHaveBeenCalled()
  })

  // Apple retries a non-2xx for days, which is what we want for a transient
  // Firestore failure — the event is still valid and still needs applying.
  it('answers 500 so Apple retries when handling fails', async () => {
    handleAppleNotification.mockRejectedValue(new Error('firestore unavailable'))

    const res = await notify({ signedPayload: 'signed' })

    expect(res.status).toBe(500)
    expect(res.body.code).toBe('handler_failed')
  })

  it('needs no authentication — the signature is the credential', async () => {
    handleAppleNotification.mockResolvedValue(undefined)

    const res = await notify({ signedPayload: 'signed' })

    expect(res.status).toBe(200)
  })
})

describe('the generic error wrapper', () => {
  // The underlying text is Stripe API prose, a Firestore index or permission
  // error, or `APPLE_APP_APPLE_ID is not configured` — which enumerates which
  // credentials exist. It belongs in the log, joined to the response by the
  // correlation id, not in the body.
  it('answers 500 with a fixed message, not the exception text', async () => {
    stripeOn = true
    createCheckoutSession.mockRejectedValue(
      new Error('STRIPE_SECRET_KEY is not configured')
    )

    const res = await fetch(`http://127.0.0.1:${port}/billing/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer good' },
      body: '{}',
    })
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.code).toBe('billing_error')
    expect(body.message).not.toContain('STRIPE_SECRET_KEY')
    expect(body.message).toBe('Something went wrong on our end. Please try again.')
  })

  it('still returns the correlation id, so the log line can be found', async () => {
    stripeOn = true
    createCheckoutSession.mockRejectedValue(new Error('boom'))

    const res = await fetch(`http://127.0.0.1:${port}/billing/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer good' },
      body: '{}',
    })

    expect((await res.json()).correlationId).toBe('test-correlation')
  })
})
