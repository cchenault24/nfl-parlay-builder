import type { Transaction } from 'firebase-admin/firestore'
import { db } from '../firebase'
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
interface EntitlementRecord {
  tier: Tier
  source: 'stripe' | 'iap' | 'manual'
  // Set when a subscription is ending; access is restricted at this instant but
  // nothing is ever deleted, so resubscribing restores the full view.
  accessEndsAt?: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
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

export async function setEntitlement(
  uid: string,
  update: Omit<EntitlementRecord, 'updatedAt'>
): Promise<void> {
  await entitlementRef(uid).set(
    { ...update, updatedAt: new Date().toISOString() },
    { merge: true }
  )
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

// Increments the bucket inside a caller-supplied transaction. It is written this
// way so the commit can share the transaction that moves a run to 'succeeded':
// that transition happens exactly once, so sharing it makes the increment
// exactly-once too. Committing afterwards in its own transaction could double
// count on a retry, which would silently cost a free user a generation.
//
// The read has to happen before any write in the transaction, which is why this
// takes the transaction rather than a batch.
export async function commitGenerationInTx(
  tx: Transaction,
  uid: string,
  now = new Date()
): Promise<void> {
  const ref = quotaRef(uid)
  const snap = await tx.get(ref)
  const windowStart = quotaWindowStart(now)
  const record = snap.exists ? (snap.data() as QuotaRecord) : undefined
  const used = record && record.windowStart === windowStart ? record.used : 0
  tx.set(ref, { windowStart, used: used + 1 })
}
