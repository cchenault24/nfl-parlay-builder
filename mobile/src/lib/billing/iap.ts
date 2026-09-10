import { EntitlementsService } from '@shared/api/EntitlementsService'
import { sharedRuntime } from '@shared/runtime'
import {
  finishTransaction,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
} from 'expo-iap'

const service = new EntitlementsService()

// The App Store product that maps to ParlAId Pro. Must match the identifier
// created in App Store Connect, or StoreKit returns no products at all.
export const PRO_PRODUCT_ID = 'com.debugdad.parlaid.pro.monthly'

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

// expo-iap delivers the outcome through listeners rather than the requestPurchase
// return value, so this wraps the event flow into one awaitable call for the UI.
//
// The order matters and is not interchangeable: verify on the server first, and
// only then finishTransaction. An unfinished iOS transaction replays on every
// app launch, which is the safety net if this process dies mid-flight — finishing
// early would throw that away and leave a paid user without Pro.
export async function purchasePro(): Promise<void> {
  await initConnection()

  return new Promise<void>((resolve, reject) => {
    let settled = false

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
      try {
        // Unified across platforms; on iOS this is the StoreKit 2 JWS.
        const signedTransaction = purchase.purchaseToken
        if (!signedTransaction) {
          throw new Error('The App Store returned a purchase with no signed transaction.')
        }
        await redeemSignedTransaction(signedTransaction)
        // A subscription is not consumable — consuming it would let the same
        // period be bought again.
        await finishTransaction({ purchase, isConsumable: false })
        settle(resolve)
      } catch (e) {
        settle(() =>
          reject(e instanceof Error ? e : new Error('Purchase could not be verified.'))
        )
      }
    })

    const failed = purchaseErrorListener(error => {
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
