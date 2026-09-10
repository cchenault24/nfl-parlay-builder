import {
  Environment,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from '@apple/app-store-server-library'
import { log } from '../observability/logger'
import { findUidByAppleTransaction, setEntitlement } from '../tiering/store'
import { APPLE_APP_APPLE_ID, APPLE_BUNDLE_ID, APPLE_ROOT_CA_G3 } from './config'

// Production and sandbox transactions are signed by the same root but carry
// different environments, and a verifier built for one rejects the other. Apple
// reviewers test against sandbox on a production build, so both must work or
// review fails on a purchase that looks broken.
function verifierFor(environment: Environment): SignedDataVerifier {
  const rootCert = Buffer.from(APPLE_ROOT_CA_G3.value(), 'base64')
  return new SignedDataVerifier(
    [rootCert],
    // Online revocation checks add a network round trip to Apple on every
    // notification. The root is pinned and the payloads are short-lived, so the
    // offline check is the right trade here.
    false,
    environment,
    APPLE_BUNDLE_ID.value(),
    Number(APPLE_APP_APPLE_ID.value())
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

function grantFrom(payload: JWSTransactionDecodedPayload): {
  tier: 'pro' | 'free'
  accessEndsAt: string | null
} {
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
