import { beforeEach, describe, expect, it, vi } from 'vitest'

// expo-iap is a native module, so the whole surface is stubbed and every
// assertion is about the decisions this file makes on top of it: what counts as
// a failure, what gets finished, and in which order.

type Listener = (arg: never) => void

const initConnection = vi.fn()
const getAvailablePurchases = vi.fn()
const finishTransaction = vi.fn()
const requestPurchase = vi.fn()

let onUpdated: Listener | null = null
let onError: Listener | null = null
const removeUpdated = vi.fn()
const removeError = vi.fn()

vi.mock('expo-iap', () => ({
  // Mirrors expo-iap's own string values; the codes are the contract.
  ErrorCode: {
    UserCancelled: 'user-cancelled',
    DeferredPayment: 'deferred-payment',
    AlreadyOwned: 'already-owned',
    IapNotAvailable: 'iap-not-available',
  },
  initConnection: () => initConnection(),
  getAvailablePurchases: () => getAvailablePurchases(),
  finishTransaction: (args: unknown) => finishTransaction(args),
  requestPurchase: (args: unknown) => requestPurchase(args),
  purchaseUpdatedListener: (fn: Listener) => {
    onUpdated = fn
    return { remove: removeUpdated }
  },
  purchaseErrorListener: (fn: Listener) => {
    onError = fn
    return { remove: removeError }
  },
}))

// accountToken pulls in expo-crypto, which reaches react-native — unparseable
// in this node environment. The UUID derivation is covered on its own in
// accountToken.test.ts; what matters here is only that a token is passed along.
vi.mock('./accountToken', () => ({
  appAccountTokenFor: async (uid: string) => `token-for-${uid}`,
}))

const redeemAppleTransaction = vi.fn()
vi.mock('@shared/api/EntitlementsService', () => ({
  EntitlementsService: class {
    redeemAppleTransaction = (...args: unknown[]) => redeemAppleTransaction(...args)
  },
}))

let idToken: string | null = 'token-1'
vi.mock('@shared/runtime', () => ({
  sharedRuntime: () => ({ getIdToken: async () => idToken }),
}))

const { PRO_PRODUCT_ID, purchasePro, reconcilePurchases, redeemSignedTransaction } =
  await import('./iap')

function purchase(overrides: Record<string, unknown> = {}) {
  return {
    productId: PRO_PRODUCT_ID,
    purchaseToken: 'jws-1',
    purchaseState: 'purchased',
    ...overrides,
  }
}

// `purchasePro` awaits connect() before it registers anything, so a test has to
// let that microtask run before it can drive the listeners.
const settled = () => new Promise(resolve => setTimeout(resolve, 0))

async function emitUpdate(p: unknown) {
  await settled()
  ;(onUpdated as unknown as (x: unknown) => void)(p)
  await settled()
}

async function emitError(e: unknown) {
  await settled()
  ;(onError as unknown as (x: unknown) => void)(e)
  await settled()
}

beforeEach(() => {
  vi.clearAllMocks()
  onUpdated = null
  onError = null
  idToken = 'token-1'
  initConnection.mockResolvedValue(true)
  getAvailablePurchases.mockResolvedValue([])
  finishTransaction.mockResolvedValue(undefined)
  requestPurchase.mockResolvedValue(undefined)
  redeemAppleTransaction.mockResolvedValue({ tier: 'pro', accessEndsAt: null })
})

describe('redeemSignedTransaction', () => {
  it('posts the signed transaction with the caller’s token', async () => {
    await redeemSignedTransaction('jws-1')

    expect(redeemAppleTransaction).toHaveBeenCalledWith('token-1', 'jws-1')
  })

  it('refuses when the session has gone', async () => {
    idToken = null

    await expect(redeemSignedTransaction('jws-1')).rejects.toThrow(/sign in again/)
    expect(redeemAppleTransaction).not.toHaveBeenCalled()
  })
})

describe('purchasePro', () => {
  it('redeems then finishes, in that order, and resolves purchased', async () => {
    const order: string[] = []
    redeemAppleTransaction.mockImplementation(async () => {
      order.push('redeem')
      return { tier: 'pro', accessEndsAt: null }
    })
    finishTransaction.mockImplementation(async () => {
      order.push('finish')
    })

    const pending = purchasePro()
    await emitUpdate(purchase())

    await expect(pending).resolves.toEqual({ status: 'purchased' })
    // Finishing first would tell StoreKit the purchase is handled before the
    // server had granted anything, and iOS never replays a finished transaction.
    expect(order).toEqual(['redeem', 'finish'])
    expect(finishTransaction).toHaveBeenCalledWith({
      purchase: purchase(),
      isConsumable: false,
    })
  })

  it('never consumes the subscription', async () => {
    const pending = purchasePro()
    await emitUpdate(purchase())
    await pending

    expect(finishTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ isConsumable: false })
    )
  })

  // The listener is global. A replayed transaction for another product must not
  // resolve this purchase as if it were the one the user just made.
  it('ignores a transaction for a different product', async () => {
    const pending = purchasePro()
    await emitUpdate(purchase({ productId: 'com.debugdad.parlaid.other' }))

    expect(redeemAppleTransaction).not.toHaveBeenCalled()

    await emitUpdate(purchase())
    await expect(pending).resolves.toEqual({ status: 'purchased' })
  })

  it('leaves the transaction unfinished when redemption fails', async () => {
    redeemAppleTransaction.mockRejectedValue(new Error('network down'))

    const pending = purchasePro()
    const rejected = expect(pending).rejects.toThrow('network down')
    await emitUpdate(purchase())

    await rejected
    // Unfinished is what lets reconcilePurchases pick it up later. Finishing
    // here would strand a user who has already been charged.
    expect(finishTransaction).not.toHaveBeenCalled()
  })

  it('rejects a purchase that carries no signed transaction', async () => {
    const pending = purchasePro()
    const rejected = expect(pending).rejects.toThrow(/no signed transaction/)
    await emitUpdate(purchase({ purchaseToken: undefined }))

    await rejected
    expect(finishTransaction).not.toHaveBeenCalled()
  })

  // A cancel is the most-travelled branch in the whole flow. Reporting it as a
  // failure puts a red error under the user's own deliberate action.
  it('resolves cancelled rather than failing when the user dismisses the sheet', async () => {
    const pending = purchasePro()
    await emitError({ code: 'user-cancelled', message: 'User cancelled the purchase flow' })

    await expect(pending).resolves.toEqual({ status: 'cancelled' })
  })

  it('resolves pending for an Ask to Buy deferral', async () => {
    const pending = purchasePro()
    await emitError({ code: 'deferred-payment', message: 'Deferred' })

    await expect(pending).resolves.toEqual({ status: 'pending' })
  })

  it('does not finish a purchase that is still pending approval', async () => {
    const pending = purchasePro()
    await emitUpdate(purchase({ purchaseState: 'pending' }))

    await expect(pending).resolves.toEqual({ status: 'pending' })
    expect(redeemAppleTransaction).not.toHaveBeenCalled()
    expect(finishTransaction).not.toHaveBeenCalled()
  })

  // already-owned means the entitlement never landed, not that they should buy
  // twice — so it reconciles instead of erroring.
  it('reconciles an already-owned subscription instead of reporting failure', async () => {
    getAvailablePurchases.mockResolvedValue([purchase()])

    const pending = purchasePro()
    await emitError({ code: 'already-owned', message: 'Already owned' })

    await expect(pending).resolves.toEqual({ status: 'purchased' })
    expect(redeemAppleTransaction).toHaveBeenCalledWith('token-1', 'jws-1')
  })

  it('points at Restore when already-owned finds nothing to reconcile', async () => {
    getAvailablePurchases.mockResolvedValue([])

    const pending = purchasePro()
    const rejected = expect(pending).rejects.toThrow(/Restore Purchases/)
    await emitError({ code: 'already-owned', message: 'Already owned' })

    await rejected
  })

  it('surfaces a genuine store error', async () => {
    const pending = purchasePro()
    const rejected = expect(pending).rejects.toThrow('The store is unavailable')
    await emitError({ code: 'service-error', message: 'The store is unavailable' })

    await rejected
  })

  it('reports a device that cannot pay, without opening a sheet', async () => {
    initConnection.mockResolvedValue(false)

    await expect(purchasePro()).rejects.toThrow(/not available on this device/)
    expect(requestPurchase).not.toHaveBeenCalled()
  })

  it('rejects when the store refuses to open the sheet', async () => {
    requestPurchase.mockRejectedValue(new Error('sheet unavailable'))

    await expect(purchasePro()).rejects.toThrow('sheet unavailable')
  })

  it('removes both listeners once settled', async () => {
    const pending = purchasePro()
    await emitUpdate(purchase())
    await pending

    expect(removeUpdated).toHaveBeenCalledTimes(1)
    expect(removeError).toHaveBeenCalledTimes(1)
  })

  it('settles once, so a second event cannot redeem twice', async () => {
    const pending = purchasePro()
    await emitUpdate(purchase())
    await pending

    await emitUpdate(purchase())
    await emitError({ code: 'service-error', message: 'late' })

    expect(redeemAppleTransaction).toHaveBeenCalledTimes(1)
    expect(finishTransaction).toHaveBeenCalledTimes(1)
  })

  it('requests the Pro subscription as a subscription, not a one-off', async () => {
    const pending = purchasePro()
    await emitUpdate(purchase())
    await pending

    expect(requestPurchase).toHaveBeenCalledWith({
      request: { apple: { sku: PRO_PRODUCT_ID } },
      type: 'subs',
    })
  })

  // Apple echoes appAccountToken back on every later transaction and server
  // notification, so it is the fallback attribution path when the
  // originalTransactionId index cannot answer.
  it('sends an appAccountToken when the caller knows the uid', async () => {
    const pending = purchasePro('uid-1')
    await emitUpdate(purchase())
    await pending

    expect(requestPurchase).toHaveBeenCalledWith({
      request: { apple: { sku: PRO_PRODUCT_ID, appAccountToken: 'token-for-uid-1' } },
      type: 'subs',
    })
  })

  // A purchase without it still works; it just loses the fallback path, so a
  // missing uid must not block buying.
  it('still purchases when there is no uid to derive one from', async () => {
    const pending = purchasePro(undefined)
    await emitUpdate(purchase())

    await expect(pending).resolves.toEqual({ status: 'purchased' })
    expect(requestPurchase).toHaveBeenCalledWith({
      request: { apple: { sku: PRO_PRODUCT_ID } },
      type: 'subs',
    })
  })
})

describe('reconcilePurchases', () => {
  // The recovery path for a purchase whose redemption failed. Without it a
  // charged user has no way back from inside the app.
  it('redeems and finishes every outstanding Pro purchase', async () => {
    getAvailablePurchases.mockResolvedValue([
      purchase({ purchaseToken: 'jws-a' }),
      purchase({ purchaseToken: 'jws-b' }),
    ])

    await expect(reconcilePurchases()).resolves.toBe(2)
    expect(redeemAppleTransaction).toHaveBeenCalledTimes(2)
    expect(finishTransaction).toHaveBeenCalledTimes(2)
  })

  it('returns zero when there is nothing outstanding', async () => {
    getAvailablePurchases.mockResolvedValue([])

    await expect(reconcilePurchases()).resolves.toBe(0)
    expect(finishTransaction).not.toHaveBeenCalled()
  })

  it('skips purchases for other products', async () => {
    getAvailablePurchases.mockResolvedValue([
      purchase({ productId: 'com.debugdad.parlaid.other' }),
    ])

    await expect(reconcilePurchases()).resolves.toBe(0)
    expect(redeemAppleTransaction).not.toHaveBeenCalled()
  })

  // A deferred purchase has not been paid for yet; finishing it would throw
  // away the parental approval that is still to come.
  it('leaves a still-pending purchase alone', async () => {
    getAvailablePurchases.mockResolvedValue([purchase({ purchaseState: 'pending' })])

    await expect(reconcilePurchases()).resolves.toBe(0)
    expect(redeemAppleTransaction).not.toHaveBeenCalled()
    expect(finishTransaction).not.toHaveBeenCalled()
  })

  it('propagates a redemption failure rather than finishing the transaction', async () => {
    getAvailablePurchases.mockResolvedValue([purchase()])
    redeemAppleTransaction.mockRejectedValue(new Error('server down'))

    await expect(reconcilePurchases()).rejects.toThrow('server down')
    expect(finishTransaction).not.toHaveBeenCalled()
  })

  it('reports a device that cannot pay', async () => {
    initConnection.mockResolvedValue(false)

    await expect(reconcilePurchases()).rejects.toThrow(/not available on this device/)
    expect(getAvailablePurchases).not.toHaveBeenCalled()
  })
})
