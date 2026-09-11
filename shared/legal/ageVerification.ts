// The age gate's storage contract and its one decision, shared by both clients.
//
// The backends genuinely differ — localStorage on web is synchronous,
// AsyncStorage on iOS is not — so the hooks stay separate. The key, the expiry
// and the rule do not: this is a compliance control, and the iOS build is the
// one under App Store review for it, so the two clients enforcing different
// policies is the failure worth designing out rather than remembering.

export const AGE_VERIFICATION_KEY = 'nfl-parlay-age-verified'

// Re-verify every 30 days.
export const VERIFICATION_EXPIRY_DAYS = 30

export interface AgeVerificationRecord {
  verified: boolean
  timestamp: number
}

const DAY_MS = 1000 * 60 * 60 * 24

/**
 * Whether a stored record still counts as verified.
 *
 * Fails closed on every unreadable input — absent, malformed JSON, the wrong
 * shape, a record that says `verified: false`, or one past its expiry. An age
 * gate that opens on a value it could not understand is worse than one that
 * asks again.
 */
export function isVerified(raw: string | null, now: number = Date.now()): boolean {
  if (!raw) {
    return false
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return false
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false
  }
  const record = parsed as Partial<AgeVerificationRecord>
  if (record.verified !== true || typeof record.timestamp !== 'number') {
    return false
  }
  // A timestamp in the future is a clock change or a tampered record, not a
  // verification that lasts longer than 30 days.
  const days = (now - record.timestamp) / DAY_MS
  return days >= 0 && days < VERIFICATION_EXPIRY_DAYS
}

export function newVerification(now: number = Date.now()): AgeVerificationRecord {
  return { verified: true, timestamp: now }
}
