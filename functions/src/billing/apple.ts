import {
  Environment,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from '@apple/app-store-server-library'
import { log } from '../observability/logger'
import { findUidByAppleTransaction, setEntitlement } from '../tiering/store'
import { billingSecret } from './config'

// Production and sandbox transactions are signed by the same root but carry
// different environments, and a verifier built for one rejects the other. Apple
// reviewers test against sandbox on a production build, so both must work or
// review fails on a purchase that looks broken.
function verifierFor(environment: Environment): SignedDataVerifier {
  const rootCert = Buffer.from(billingSecret('APPLE_ROOT_CA_G3'), 'base64')
  return new SignedDataVerifier(
    [rootCert],
    // Online revocation checks add a network round trip to Apple on every
    // notification. The root is pinned and the payloads are short-lived, so the
    // offline check is the right trade here.
    false,
    environment,
    billingSecret('APPLE_BUNDLE_ID'),
    Number(billingSecret('APPLE_APP_APPLE_ID'))
  )
}

// Tries production first, then sandbox. Apple's own guidance is to treat a
// production rejection as "might be sandbox" rather than as a forgery.
async function verify<T>(
  attempt: (verifier: SignedDataVerifier) => Promise<T>
): Promise<T> {
  try {
    return await attempt(verifierFor(Environment.PRODUCTION))
  } catch {
    return await attempt(verifierFor(Environment.SANDBOX))
  }
}

// The App Store product that maps to ParlAId Pro. The client holds the same
// string (mobile/src/lib/billing/iap.ts) and cannot share this one: `functions/`
// compiles with rootDir "src" and Firebase packages only that directory, so it
// cannot import from shared/. Two copies across a build boundary that has no
// bridge — change both together.
export const PRO_PRODUCT_ID = 'com.debugdad.parlaid.pro.monthly'

function grantFrom(payload: JWSTransactionDecodedPayload): {
  tier: 'pro' | 'free'
  accessEndsAt: string | null
} {
  // A refunded or revoked transaction stays cryptographically valid and keeps
  // its original expiresDate, so the date alone would re-grant Pro to someone
  // Apple already took the money back from — replayable for as long as the
  // period runs.
  if (payload.revocationDate) {
    return { tier: 'free', accessEndsAt: null }
  }
  // An auto-renewing subscription is entitled until expiresDate. Apple sends
  // renewals ahead of that date, so a lapsed one simply stops being renewed
  // rather than being revoked — which is why an elapsed date demotes on read.
  const expires = payload.expiresDate
  if (!expires) {
    return { tier: 'free', accessEndsAt: null }
  }
  return {
    tier: expires > Date.now() ? 'pro' : 'free',
    accessEndsAt: new Date(expires).toISOString(),
  }
}

// Called by the app right after a StoreKit purchase, with the signed transaction
// it received. Verifying here rather than trusting the client is the whole
// point: a client claiming "I bought Pro" is not evidence of anything.
export async function redeemAppleTransaction(
  uid: string,
  signedTransaction: string
): Promise<{ tier: 'pro' | 'free'; accessEndsAt: string | null }> {
  const payload = await verify(v => v.verifyAndDecodeTransaction(signedTransaction))

  // A verified signature proves Apple issued *a* transaction, not that it was
  // for the thing being granted. Without this, any signed auto-renewing
  // transaction for this bundle grants Pro.
  if (payload.productId !== PRO_PRODUCT_ID) {
    throw new Error(`Transaction is for ${payload.productId ?? 'no product'}, not Pro`)
  }

  // Nor does a signature prove the *caller* made the purchase. A JWS can be
  // lifted off one device and posted from another account, which would turn one
  // subscription into unlimited Pro grants — and because findUidByAppleTransaction
  // resolves one uid, a later REFUND would demote exactly one of them and leave
  // the rest entitled forever.
  const holder = payload.originalTransactionId
    ? await findUidByAppleTransaction(payload.originalTransactionId)
    : undefined
  if (holder && holder !== uid) {
    log.warn('billing.apple.transaction_already_claimed', {
      correlationId: payload.originalTransactionId ?? 'unknown',
      uid,
      error: {
        code: 'transaction_already_claimed',
        message: `Apple transaction ${payload.originalTransactionId} is held by another account`,
      },
    })
    throw new Error('That subscription is already attached to a different account.')
  }

  const grant = grantFrom(payload)

  await setEntitlement(uid, {
    tier: grant.tier,
    source: 'iap',
    // Stored so a later renewal notification, which arrives with no uid, can be
    // attributed back to this user.
    appleOriginalTransactionId: payload.originalTransactionId,
    ...(payload.appAccountToken ? { appleAccountToken: payload.appAccountToken } : {}),
    accessEndsAt: grant.accessEndsAt,
  })

  log.info('billing.apple.redeemed', {
    correlationId: payload.originalTransactionId ?? 'unknown',
    uid,
    tier: grant.tier,
    accessEndsAt: grant.accessEndsAt,
  })
  return grant
}

// App Store Server Notifications V2. Apple posts { signedPayload } and expects a
// 2xx; anything else is retried for days, so an event this cannot attribute is
// logged and accepted rather than failed.
export async function handleAppleNotification(signedPayload: string): Promise<void> {
  const payload: ResponseBodyV2DecodedPayload = await verify(v =>
    v.verifyAndDecodeNotification(signedPayload)
  )

  const signedTransaction = payload.data?.signedTransactionInfo
  if (!signedTransaction) {
    log.info('billing.apple.notification_without_transaction', {
      correlationId: payload.notificationUUID ?? 'unknown',
      type: payload.notificationType,
    })
    return
  }

  const transaction = await verify(v =>
    v.verifyAndDecodeTransaction(signedTransaction)
  )
  const originalTransactionId = transaction.originalTransactionId
  if (!originalTransactionId) {
    return
  }

  // The originalTransactionId was recorded when the app redeemed the purchase,
  // which is what makes an otherwise anonymous renewal attributable.
  const uid = await findUidByAppleTransaction(originalTransactionId)
  if (!uid) {
    log.error('billing.apple.unattributed_notification', {
      correlationId: payload.notificationUUID ?? 'unknown',
      error: {
        code: 'unknown_subscriber',
        message: `No user holds Apple transaction ${originalTransactionId}`,
      },
    })
    return
  }

  const grant = grantFrom(transaction)
  // REFUND and REVOKE end access immediately regardless of the expiry date —
  // the user no longer paid for the period they are inside.
  const revoked =
    payload.notificationType === 'REFUND' || payload.notificationType === 'REVOKE'

  await setEntitlement(uid, {
    tier: revoked ? 'free' : grant.tier,
    source: 'iap',
    appleOriginalTransactionId: originalTransactionId,
    accessEndsAt: revoked ? null : grant.accessEndsAt,
  })

  log.info('billing.apple.notification', {
    correlationId: payload.notificationUUID ?? 'unknown',
    uid,
    type: payload.notificationType,
    tier: revoked ? 'free' : grant.tier,
  })
}
