import { beforeEach, describe, expect, it, vi } from 'vitest'

// The verifier is the boundary: it proves Apple signed the payload, and every
// decision this module makes is about what to do with an already-verified one.
// Stubbing it is what lets those decisions be tested without a signing key.
const verifyTransaction = vi.fn()
const verifyNotification = vi.fn()

vi.mock('@apple/app-store-server-library', () => ({
  Environment: { PRODUCTION: 'Production', SANDBOX: 'Sandbox' },
  SignedDataVerifier: class {
    verifyAndDecodeTransaction = verifyTransaction
    verifyAndDecodeNotification = verifyNotification
  },
}))

vi.mock('./config', () => ({
  billingSecret: (name: string) =>
    name === 'APPLE_APP_APPLE_ID' ? '123456' : 'stub',
}))

const setEntitlement = vi.fn()
const findUidByAppleTransaction = vi.fn()
vi.mock('../tiering/store', () => ({
  setEntitlement: (...args: unknown[]) => setEntitlement(...args),
  findUidByAppleTransaction: (...args: unknown[]) =>
    findUidByAppleTransaction(...args),
}))

vi.mock('../observability/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { handleAppleNotification, PRO_PRODUCT_ID, redeemAppleTransaction } =
  await import('./apple')

const HOUR = 3_600_000

function transaction(overrides: Record<string, unknown> = {}) {
  return {
    productId: PRO_PRODUCT_ID,
    originalTransactionId: 'orig-1',
    expiresDate: Date.now() + 24 * HOUR,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  findUidByAppleTransaction.mockResolvedValue(undefined)
  setEntitlement.mockResolvedValue(undefined)
})

describe('redeemAppleTransaction', () => {
  it('grants pro for a valid unexpired transaction', async () => {
    verifyTransaction.mockResolvedValue(transaction())

    const grant = await redeemAppleTransaction('uid-1', 'jws')

    expect(grant.tier).toBe('pro')
    expect(setEntitlement).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({
        tier: 'pro',
        source: 'iap',
        appleOriginalTransactionId: 'orig-1',
      })
    )
  })

  it('records the appAccountToken when Apple echoes one back', async () => {
    verifyTransaction.mockResolvedValue(transaction({ appAccountToken: 'tok-9' }))

    await redeemAppleTransaction('uid-1', 'jws')

    expect(setEntitlement).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ appleAccountToken: 'tok-9' })
    )
  })

  it('demotes to free when the entitlement period has already elapsed', async () => {
    verifyTransaction.mockResolvedValue(
      transaction({ expiresDate: Date.now() - HOUR })
    )

    const grant = await redeemAppleTransaction('uid-1', 'jws')

    expect(grant.tier).toBe('free')
  })

  it('demotes to free when the transaction carries no expiry', async () => {
    verifyTransaction.mockResolvedValue(transaction({ expiresDate: undefined }))

    const grant = await redeemAppleTransaction('uid-1', 'jws')

    expect(grant).toEqual({ tier: 'free', accessEndsAt: null })
  })

  // The replay this guards: a refund demotes the user via the webhook, and the
  // JWS they still hold stays valid and unexpired, so re-posting it would hand
  // Pro straight back — repeatable for the rest of the period.
  it('refuses to re-grant a revoked transaction even while unexpired', async () => {
    verifyTransaction.mockResolvedValue(
      transaction({ revocationDate: Date.now() - HOUR })
    )

    const grant = await redeemAppleTransaction('uid-1', 'jws')

    expect(grant).toEqual({ tier: 'free', accessEndsAt: null })
    expect(setEntitlement).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ tier: 'free' })
    )
  })

  it('rejects a signed transaction for some other product', async () => {
    verifyTransaction.mockResolvedValue(
      transaction({ productId: 'com.debugdad.parlaid.something.else' })
    )

    await expect(redeemAppleTransaction('uid-1', 'jws')).rejects.toThrow(/not Pro/)
    expect(setEntitlement).not.toHaveBeenCalled()
  })

  it('rejects a transaction with no product id at all', async () => {
    verifyTransaction.mockResolvedValue(transaction({ productId: undefined }))

    await expect(redeemAppleTransaction('uid-1', 'jws')).rejects.toThrow(/not Pro/)
    expect(setEntitlement).not.toHaveBeenCalled()
  })

  // One subscription, one account. Without this, a JWS lifted off one device
  // grants Pro to every account it is posted from, and a later refund demotes
  // only whichever uid the index happens to return first.
  it('refuses a transaction already held by a different account', async () => {
    verifyTransaction.mockResolvedValue(transaction())
    findUidByAppleTransaction.mockResolvedValue('uid-other')

    await expect(redeemAppleTransaction('uid-1', 'jws')).rejects.toThrow(
      /already attached to a different account/
    )
    expect(setEntitlement).not.toHaveBeenCalled()
  })

  it('allows the holder to redeem their own transaction again', async () => {
    verifyTransaction.mockResolvedValue(transaction())
    findUidByAppleTransaction.mockResolvedValue('uid-1')

    const grant = await redeemAppleTransaction('uid-1', 'jws')

    expect(grant.tier).toBe('pro')
    expect(setEntitlement).toHaveBeenCalled()
  })

  // Apple reviewers test sandbox purchases against a production build, so a
  // production-verifier rejection must fall through rather than fail review.
  it('falls back to the sandbox verifier when production rejects', async () => {
    verifyTransaction
      .mockRejectedValueOnce(new Error('wrong environment'))
      .mockResolvedValueOnce(transaction())

    const grant = await redeemAppleTransaction('uid-1', 'jws')

    expect(grant.tier).toBe('pro')
    expect(verifyTransaction).toHaveBeenCalledTimes(2)
  })

  it('propagates a failure when neither environment verifies', async () => {
    verifyTransaction.mockRejectedValue(new Error('bad signature'))

    await expect(redeemAppleTransaction('uid-1', 'jws')).rejects.toThrow(
      'bad signature'
    )
    expect(setEntitlement).not.toHaveBeenCalled()
  })
})

describe('handleAppleNotification', () => {
  const notification = (type: string, signedTransactionInfo = 'inner-jws') => ({
    notificationType: type,
    notificationUUID: 'uuid-1',
    data: { signedTransactionInfo },
  })

  it('renews pro on a DID_RENEW notification', async () => {
    verifyNotification.mockResolvedValue(notification('DID_RENEW'))
    verifyTransaction.mockResolvedValue(transaction())
    findUidByAppleTransaction.mockResolvedValue('uid-1')

    await handleAppleNotification('signed')

    expect(setEntitlement).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ tier: 'pro' })
    )
  })

  // The expiry date is still in the future on a refund — only the notification
  // type says the money came back, so it has to beat the date.
  it('revokes access on REFUND even though the period has not elapsed', async () => {
    verifyNotification.mockResolvedValue(notification('REFUND'))
    verifyTransaction.mockResolvedValue(transaction())
    findUidByAppleTransaction.mockResolvedValue('uid-1')

    await handleAppleNotification('signed')

    expect(setEntitlement).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ tier: 'free', accessEndsAt: null })
    )
  })

  it('revokes access on REVOKE', async () => {
    verifyNotification.mockResolvedValue(notification('REVOKE'))
    verifyTransaction.mockResolvedValue(transaction())
    findUidByAppleTransaction.mockResolvedValue('uid-1')

    await handleAppleNotification('signed')

    expect(setEntitlement).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ tier: 'free', accessEndsAt: null })
    )
  })

  // Apple retries a non-2xx for days, so an event we cannot attribute has to be
  // logged and accepted rather than thrown.
  it('accepts an unattributable notification without writing or throwing', async () => {
    verifyNotification.mockResolvedValue(notification('DID_RENEW'))
    verifyTransaction.mockResolvedValue(transaction())
    findUidByAppleTransaction.mockResolvedValue(undefined)

    await expect(handleAppleNotification('signed')).resolves.toBeUndefined()
    expect(setEntitlement).not.toHaveBeenCalled()
  })

  it('accepts a notification that carries no transaction', async () => {
    verifyNotification.mockResolvedValue({
      notificationType: 'TEST',
      notificationUUID: 'uuid-1',
      data: {},
    })

    await expect(handleAppleNotification('signed')).resolves.toBeUndefined()
    expect(verifyTransaction).not.toHaveBeenCalled()
    expect(setEntitlement).not.toHaveBeenCalled()
  })

  it('ignores a transaction with no originalTransactionId', async () => {
    verifyNotification.mockResolvedValue(notification('DID_RENEW'))
    verifyTransaction.mockResolvedValue(
      transaction({ originalTransactionId: undefined })
    )

    await handleAppleNotification('signed')

    expect(findUidByAppleTransaction).not.toHaveBeenCalled()
    expect(setEntitlement).not.toHaveBeenCalled()
  })
})
