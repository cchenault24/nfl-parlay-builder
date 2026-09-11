import { persistableEntries, type ParlayEntry } from '@shared/store/parlayStore'

// This week's working set, kept across relaunches so a spent generation is never
// lost to closing the app. History remains the durable, graded record — see
// DESIGN decisions #5 and #6.
//
// Hand-rolled rather than zustand's `persist` middleware, which the rate-limit
// store uses. `persist` fixes its storage name when the store is created, and
// this cache is keyed by uid — so sharing that mechanism would mean a store
// instance per account, which is worse than the twenty lines below. The week
// pruning has no `persist` equivalent either.
//
// Versioned in the key rather than migrated: the entries are a cache of runs the
// user can re-create, and a shape change is better answered by starting the week
// again than by carrying a migration for something disposable.
const PARLAY_STORAGE_PREFIX = 'parlaid.build.entries.v1'

// Scoped to the account that generated them. A single shared key meant the next
// person to sign in on the same device hydrated the previous one's parlays —
// their picks, odds and AI reasoning — into their own Build list, and that a
// deleted account's content stayed on the device after the server had wiped it.
export function parlayStorageKey(uid: string): string {
  return `${PARLAY_STORAGE_PREFIX}.${uid}`
}

// The slice of AsyncStorage this needs, named so the pure functions below can be
// exercised without a device.
export interface EntryStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

function isEntry(value: unknown): value is ParlayEntry {
  const entry = value as Partial<ParlayEntry> | null
  return (
    !!entry &&
    typeof entry.key === 'string' &&
    typeof entry.week === 'number' &&
    Array.isArray(entry.gameIds) &&
    typeof entry.status === 'string' &&
    !!entry.parlay
  )
}

export function serializeEntries(entries: Record<string, ParlayEntry>): string {
  return JSON.stringify(persistableEntries(entries))
}

// Anything that is not a finished parlay from `minWeek` or later is dropped.
//
// `minWeek` is the *live* week, not the one being browsed: a week whose games
// have kicked off has been superseded, but a future week the user was looking
// at has not — pruning to the browsed week would delete this week's parlays the
// moment someone glanced at next week's slate.
//
// A run that was mid-flight cannot be resumed either; restoring it would show a
// spinner for a run nobody is driving.
//
// Unparseable storage never throws — a Build tab that cannot open is a worse
// failure than a cold cache. It returns null rather than `{}` so the caller can
// tell "nothing stored" from "stored something I could not read": the first is
// safe to mirror back, the second must not be, because writing `{}` over a blob
// we merely failed to parse turns one bad read into permanent loss.
export function parseEntries(
  raw: string | null,
  minWeek: number
): Record<string, ParlayEntry> | null {
  if (!raw) {
    return {}
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).filter(
      (pair): pair is [string, ParlayEntry] =>
        isEntry(pair[1]) && pair[1].week >= minWeek && pair[1].status === 'ready'
    )
  )
}

export async function loadEntries(
  storage: EntryStorage,
  uid: string,
  minWeek: number
): Promise<Record<string, ParlayEntry> | null> {
  try {
    return parseEntries(await storage.getItem(parlayStorageKey(uid)), minWeek)
  } catch {
    return null
  }
}

export async function saveEntries(
  storage: EntryStorage,
  uid: string,
  entries: Record<string, ParlayEntry>
): Promise<void> {
  try {
    await storage.setItem(parlayStorageKey(uid), serializeEntries(entries))
  } catch {
    // A failed write costs the user this week's cache on next launch, which is
    // recoverable. Failing the screen over it is not.
  }
}
