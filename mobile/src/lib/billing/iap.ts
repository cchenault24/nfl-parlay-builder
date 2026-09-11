import { EntitlementsService } from '@shared/api/EntitlementsService'
import { sharedRuntime } from '@shared/runtime'
import {
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
} from 'expo-iap'

const service = new EntitlementsService()

// The App Store product that maps to ParlAId Pro. Must match the identifier
// created in App Store Connect, or StoreKit returns no products at all. The
// server holds the same string and checks it before granting — see the note in
// functions/src/billing/apple.ts for why it cannot be shared.
export const PRO_PRODUCT_ID = 'com.debugdad.parlaid.pro.monthly'

export type PurchaseOutcome =
  | { status: 'purchased' }
  // The user dismissed the App Store sheet. Not a failure, and showing it as
  // one tells them their own deliberate action went wrong.
  | { status: 'cancelled' }
  // Ask to Buy: StoreKit is holding the purchase for a parent to approve. The
  // approved transaction arrives later and is picked up by reconcilePurchases()
  // on a subsequent launch.
  | { status: 'pending' }

// Sends a StoreKit-signed transaction to the server, which verifies Apple's
// signature and grants Pro. The signature is the only thing that grants
// anything — the client's claim to have purchased is not evidence.
export async function redeemSignedTransaction(signedTransaction: string) {
  const token = await sharedRuntime().getIdToken()
  if (!token) {
    throw new Error('Please sign in again to finish your purchase.')
  }
  return service.redeemAppleTransaction(token, signedTransaction)
}

// initConnection resolves false rather than throwing when the device cannot pay
// at all — purchases restricted by Screen Time, most often. Proceeding to
// requestPurchase from there produces a generic store error instead of the true
// reason, so this turns it into one.
async function connect(): Promise<void> {
  const connected = await initConnection()
  if (!connected) {
    throw new Error('In-app purchases are not available on this device.')
  }
}

// Verify on the server first, and only then finishTransaction. The order is not
// interchangeable: finishing early tells StoreKit the purchase is handled, and
// an unfinished transaction is the only thing that survives a failure here.
async function redeemAndFinish(purchase: Purchase): Promise<void> {
  // Unified across platforms; on iOS this is the StoreKit 2 JWS.
  const signedTransaction = purchase.purchaseToken
  if (!signedTransaction) {
    throw new Error('The App Store returned a purchase with no signed transaction.')
  }
  await redeemSignedTransaction(signedTransaction)
  // A subscription is not consumable — consuming it would let the same period
  // be bought again.
  await finishTransaction({ purchase, isConsumable: false })
}

/**
 * Redeems every Pro purchase StoreKit is still holding, and returns how many
 * were taken.
 *
 * This is the recovery path, and nothing else provides one. A purchase whose
 * server redemption fails is deliberately left unfinished so it survives, but
 * openiap-apple drains unfinished transactions into internal pending state at
 * `initConnection` WITHOUT emitting a purchase-updated event — so no listener
 * ever sees them, and `purchaseUpdatedListener` is only registered for the few
 * seconds `purchasePro` is awaiting anyway. Without an explicit
 * `getAvailablePurchases` sweep a user who paid and lost the network keeps
 * their charge and never gets Pro.
 *
 * Called at launch (app/_layout.tsx) and behind Restore Purchases.
 */
export async function reconcilePurchases(): Promise<number> {
  await connect()
  const purchases = await getAvailablePurchases()
  let redeemed = 0
  for (const purchase of purchases) {
    if (purchase.productId !== PRO_PRODUCT_ID) {
      continue
    }
    // A still-pending purchase has not been paid for; finishing it would
    // discard the approval that is yet to arrive.
    if (purchase.purchaseState === 'pending') {
      continue
    }
    await redeemAndFinish(purchase)
    redeemed += 1
  }
  return redeemed
}

/**
 * The subscription's price, localized by StoreKit, or null when the store has
 * nothing to say.
 *
 * Never a hardcoded string. The paywall used to read "$9.99 a month" to every
 * storefront, so a user in the UK was quoted dollars and charged pounds, and any
 * App Store Connect price change or introductory offer desynced the number from
 * what the sheet actually charges — which is a 3.1.2 rejection as well as a lie.
 */
export async function proPrice(): Promise<string | null> {
  try {
    await connect()
    const products = await fetchProducts({ skus: [PRO_PRODUCT_ID], type: 'subs' })
    const product = (products as { id?: string; displayPrice?: string }[]).find(
      p => p.id === PRO_PRODUCT_ID
    )
    return product?.displayPrice ?? null
  } catch {
    // The features are still worth showing without a price; a wrong price is
    // worse than none.
    return null
  }
}

// expo-iap delivers the outcome through listeners rather than the requestPurchase
// return value, so this wraps the event flow into one awaitable call for the UI.
export async function purchasePro(): Promise<PurchaseOutcome> {
  await connect()

  return new Promise<PurchaseOutcome>((resolve, reject) => {
    let settled = false
    // Claimed before the redeem round trip, not after it. `settled` alone is not
    // enough: removing the listener happens at settle time, so a second event
    // arriving while the first is still awaiting the server would start a second
    // redeem-and-finish for the same transaction.
    let claimed = false

    const settle = (outcome: () => void) => {
      if (settled) {
        return
      }
      settled = true
      updated.remove()
      failed.remove()
      outcome()
    }

    const updated = purchaseUpdatedListener(async (purchase: Purchase) => {
      // The listener is global: a replayed transaction for some other product
      // must not resolve this purchase.
      if (purchase.productId !== PRO_PRODUCT_ID) {
        return
      }
      if (claimed) {
        return
      }
      if (purchase.purchaseState === 'pending') {
        settle(() => resolve({ status: 'pending' }))
        return
      }
      claimed = true
      try {
        await redeemAndFinish(purchase)
        settle(() => resolve({ status: 'purchased' }))
      } catch (e) {
        settle(() =>
          reject(e instanceof Error ? e : new Error('Purchase could not be verified.'))
        )
      }
    })

    const failed = purchaseErrorListener(error => {
      // Three of these are not failures, and reporting them as one is what puts
      // a red error under a user's own Cancel tap.
      if (error.code === ErrorCode.UserCancelled) {
        settle(() => resolve({ status: 'cancelled' }))
        return
      }
      if (error.code === ErrorCode.DeferredPayment) {
        settle(() => resolve({ status: 'pending' }))
        return
      }
      if (error.code === ErrorCode.AlreadyOwned) {
        // They have it; the entitlement just never landed. Redeeming what
        // StoreKit already holds is the fix, not a second purchase.
        settle(() => {
          reconcilePurchases().then(
            redeemed =>
              redeemed > 0
                ? resolve({ status: 'purchased' })
                : reject(
                    new Error(
                      'You already have a subscription. Try Restore Purchases from the Account tab.'
                    )
                  ),
            () =>
              reject(
                new Error(
                  'You already have a subscription. Try Restore Purchases from the Account tab.'
                )
              )
          )
        })
        return
      }
      settle(() => reject(new Error(error.message || 'The purchase was not completed.')))
    })

    // Subscriptions use 'subs'. Rejections here are the store refusing to open
    // the sheet at all, which the listeners never see.
    requestPurchase({
      request: { apple: { sku: PRO_PRODUCT_ID } },
      type: 'subs',
    }).catch((e: unknown) =>
      settle(() =>
        reject(e instanceof Error ? e : new Error('Could not open the App Store.'))
      )
    )
  })
}
