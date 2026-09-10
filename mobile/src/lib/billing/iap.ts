import { EntitlementsService } from '@shared/api/EntitlementsService'
import { sharedRuntime } from '@shared/runtime'

const service = new EntitlementsService()

// The App Store product that maps to ParlAId Pro. Must match the identifier
// created in App Store Connect, or StoreKit returns no products at all.
export const PRO_PRODUCT_ID = 'com.debugdad.parlaid.pro.monthly'

// Sends a StoreKit-signed transaction to the server, which verifies Apple's
// signature and grants Pro. Deliberately separate from the purchase call: the
// signature is the only thing that grants anything, so this half is identical
// whichever StoreKit library ends up wrapping the purchase.
export async function redeemSignedTransaction(signedTransaction: string) {
  const token = await sharedRuntime().getIdToken()
  if (!token) {
    throw new Error('Please sign in again to finish your purchase.')
  }
  return service.redeemAppleTransaction(token, signedTransaction)
}

// The one piece that needs a native StoreKit binding, which this app does not
// have yet — no IAP library is installed, and adding one requires a new native
// build plus the product configured in App Store Connect.
//
// Wiring it means: buy PRO_PRODUCT_ID, take the resulting JWS signed
// transaction, and hand it to redeemSignedTransaction above. Everything from
// there — verification, entitlement, renewals and refunds via App Store Server
// Notifications — is already built and running server-side.
//
// This throws rather than resolving quietly so a tester cannot mistake an
// unwired build for a working purchase.
export async function purchasePro(): Promise<never> {
  throw new Error(
    'In-app purchase is not available in this build yet. Pro can be started on the web at nfl-parlay-builder.web.app.'
  )
}
