import { FieldValue, type Transaction } from 'firebase-admin/firestore'
import { appleConfigured, stripeConfigured } from '../billing/config'
import { db } from '../firebase'
import { SUPPORTED_BOOKMAKERS } from '../providers/odds/client'
import {
  capabilitiesFor,
  quotaWindowEnd,
  quotaWindowStart,
  type Tier,
  type TierCapabilities,
} from './capabilities'

// Entitlements are server-owned. They deliberately do not live on `users/{uid}`
// or `userSettings/{uid}`: firestore.rules grants the signed-in user write on
// both, so a tier stored there could be self-granted from a browser console.
// The rules deny clients this collection outright and /entitlements is the only
// way to read it.
export interface EntitlementRecord {
  tier: Tier
  source: 'stripe' | 'iap' | 'manual'
  // Set when a subscription is ending; access is restricted at this instant but
  // nothing is ever deleted, so resubscribing restores the full view.
  accessEndsAt?: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  // Apple has no idea what a Firebase uid is. The app derives this UUID from the
  // uid, passes it as StoreKit's appAccountToken on purchase, and Apple echoes
  // it back on every transaction and server notification — so it is the second
  // way to attribute a renewal, behind the originalTransactionId index and
  // reachable when that one cannot answer.
  appleAccountToken?: string
  appleOriginalTransactionId?: string
  // Which App Store environment signed the transaction. A sandbox purchase is
  // free and available to any TestFlight tester, so a grant from one must stay
  // distinguishable from a paid production grant rather than silently looking
  // identical to it.
  appleEnvironment?: string
  updatedAt: string
}

interface QuotaRecord {
  windowStart: string
  used: number
}

function entitlementRef(uid: string) {
  return db().collection('entitlements').doc(uid)
}

function quotaRef(uid: string) {
  return db().collection('quotas').doc(uid)
}

// A user with no entitlement record is Free. That is the common case — no write
// happens at signup, and absence is not an error.
export async function getEntitlement(uid: string): Promise<EntitlementRecord> {
  const snap = await entitlementRef(uid).get()
  const record = snap.exists ? (snap.data() as EntitlementRecord) : undefined
  if (!record) {
    return { tier: 'free', source: 'manual', updatedAt: new Date().toISOString() }
  }
  // An expired end date demotes on read rather than waiting for a sweep, so a
  // lapsed subscription cannot keep Pro alive just because no job has run yet.
  if (record.accessEndsAt && Date.parse(record.accessEndsAt) <= Date.now()) {
    return { ...record, tier: 'free' }
  }
  return record
}

// `accessEndsAt: null` clears the field. A merge write ignores `undefined`, so
// without this an end date set by a scheduled cancellation would survive the
// user un-cancelling and keep demoting them on the original date.
export async function setEntitlement(
  uid: string,
  update: Omit<EntitlementRecord, 'updatedAt' | 'accessEndsAt'> & {
    accessEndsAt?: string | null
  }
): Promise<void> {
  const { accessEndsAt, ...rest } = update
  await entitlementRef(uid).set(
    {
      ...rest,
      ...(accessEndsAt === null
        ? { accessEndsAt: FieldValue.delete() }
        : accessEndsAt !== undefined
          ? { accessEndsAt }
          : {}),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )
}

// Recorded before checkout completes, so the customer is reusable even if the
// user abandons the session — otherwise the next attempt mints a duplicate
// customer and splits their billing history across two records.
export async function setStripeCustomer(
  uid: string,
  stripeCustomerId: string
): Promise<void> {
  await entitlementRef(uid).set(
    { stripeCustomerId, updatedAt: new Date().toISOString() },
    { merge: true }
  )
}

// Apple identifies a subscriber by originalTransactionId, not by our uid, so a
// renewal notification arrives with no idea who it belongs to. This index is
// what makes that lookup possible.
export async function findUidByAppleTransaction(
  originalTransactionId: string
): Promise<string | undefined> {
  const snap = await db()
    .collection('entitlements')
    .where('appleOriginalTransactionId', '==', originalTransactionId)
    .limit(1)
    .get()
  return snap.empty ? undefined : snap.docs[0].id
}

// The second way in. The app sets `appAccountToken` on the purchase and Apple
// echoes it back on every transaction and notification, so an event whose
// originalTransactionId is missing or was never recorded can still be
// attributed. Without it, every such event fell into the unknown_subscriber
// branch with nothing to try next.
export async function findUidByAppleAccountToken(
  appleAccountToken: string
): Promise<string | undefined> {
  const snap = await db()
    .collection('entitlements')
    .where('appleAccountToken', '==', appleAccountToken)
    .limit(1)
    .get()
  return snap.empty ? undefined : snap.docs[0].id
}

// Reads the current bucket, treating a stale `windowStart` as zero rather than
// writing a reset. Nothing needs to be persisted until a generation is actually
// committed, so a user who never generates never causes a write.
export async function getQuotaUsage(uid: string, now = new Date()): Promise<number> {
  const snap = await quotaRef(uid).get()
  const record = snap.exists ? (snap.data() as QuotaRecord) : undefined
  if (!record || record.windowStart !== quotaWindowStart(now)) {
    return 0
  }
  return record.used
}

export interface EntitlementView {
  tier: Tier
  capabilities: TierCapabilities
  // What Pro grants, regardless of the tier this user is on. The upgrade sheet
  // and the locked controls need it to say what upgrading buys — a free user's
  // own `capabilities` describe only what they already have, so the clients used
  // to restate Pro's limits as English sentences and a `{ min: 2, max: 6 }`
  // default, which this file's own header forbids.
  proCapabilities: TierCapabilities
  // Served rather than hardcoded in each client, for the same reason the limits
  // are: adding a book should not need an app release on two platforms.
  sportsbooks: ReadonlyArray<{ key: string; title: string }>
  // Whether Pro can actually be bought right now. Billing ships disabled until
  // its secrets exist, and a client that cannot know this renders an Upgrade
  // button that only fails when pressed.
  billingAvailable: { stripe: boolean; apple: boolean }
  quota: {
    used: number
    limit: number | null
    remaining: number | null
    windowStart: string
    resetsAt: string
  }
  accessEndsAt?: string
}

export async function getEntitlementView(
  uid: string,
  now = new Date()
): Promise<EntitlementView> {
  const [entitlement, used] = await Promise.all([
    getEntitlement(uid),
    getQuotaUsage(uid, now),
  ])
  const capabilities = capabilitiesFor(entitlement.tier)
  const limit = capabilities.generationsPerWeek
  return {
    tier: entitlement.tier,
    capabilities,
    proCapabilities: capabilitiesFor('pro'),
    sportsbooks: SUPPORTED_BOOKMAKERS,
    billingAvailable: { stripe: stripeConfigured(), apple: appleConfigured() },
    quota: {
      used,
      limit,
      // null means unbounded, which is not the same as "none left".
      remaining: limit === null ? null : Math.max(0, limit - used),
      windowStart: quotaWindowStart(now),
      resetsAt: quotaWindowEnd(now),
    },
    ...(entitlement.accessEndsAt ? { accessEndsAt: entitlement.accessEndsAt } : {}),
  }
}

// Takes a slot inside a caller-supplied transaction, refusing when the bucket is
// already full. Returns the window the slot was taken from, or null when there
// was nothing left.
//
// Reserving at creation rather than committing at success is what makes the
// quota enforceable at all. Checking `remaining` in one HTTP request and
// debiting in another leaves the two seconds-to-minutes apart, so N concurrent
// POSTs all read the same `used` and all pass — a free user with 2 a week could
// take as many generations as the rate limiter allowed. The check and the debit
// have to be the same write.
//
// The read has to happen before any write in the transaction, which is why this
// takes the transaction rather than a batch.
export async function reserveGenerationInTx(
  tx: Transaction,
  uid: string,
  limit: number | null,
  now = new Date()
): Promise<string | null> {
  const ref = quotaRef(uid)
  const snap = await tx.get(ref)
  const windowStart = quotaWindowStart(now)
  const record = snap.exists ? (snap.data() as QuotaRecord) : undefined
  const used = record && record.windowStart === windowStart ? record.used : 0
  // null is unbounded, which is not the same as a limit of zero.
  if (limit !== null && used >= limit) {
    return null
  }
  tx.set(ref, { windowStart, used: used + 1 })
  return windowStart
}

// Gives a reserved slot back, for a run that ended without delivering what the
// tier promises: a failure, a cancellation, or a success that fell back to
// AI-estimated prices because the odds tool was unavailable.
//
// `windowStart` is the window the slot was taken from, carried on the run. A
// release into a *different* window is dropped rather than applied: the bucket
// it belongs to no longer exists, and decrementing the current one would hand
// the user a free generation every time a run straddled the Tuesday rollover.
export async function releaseGenerationInTx(
  tx: Transaction,
  uid: string,
  windowStart: string,
  now = new Date()
): Promise<void> {
  if (windowStart !== quotaWindowStart(now)) {
    return
  }
  const ref = quotaRef(uid)
  const snap = await tx.get(ref)
  const record = snap.exists ? (snap.data() as QuotaRecord) : undefined
  if (!record || record.windowStart !== windowStart) {
    return
  }
  tx.set(ref, { windowStart, used: Math.max(0, record.used - 1) })
}
