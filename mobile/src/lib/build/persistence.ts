import {
  persistableEntries,
  type ParlayEntry,
  type ParlayEntryStatus,
} from '@shared/store/parlayStore'

// This week's working set, kept across relaunches so a spent generation is never
// lost to closing the app. History remains the durable, graded record — see
// DESIGN decisions #5 and #6.
//
// Versioned in the key rather than migrated: the entries are a cache of runs the
// user can re-create, and a shape change is better answered by starting the week
// again than by carrying a migration for something disposable.
export const PARLAY_STORAGE_KEY = 'parlaid.build.entries.v1'

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

// Anything that is not a finished parlay from `week` is dropped: an earlier
// week's working set has been superseded, and a run that was mid-flight cannot
// be resumed — restoring it would show a spinner for a run nobody is driving.
//
// Unparseable storage is treated as empty rather than thrown. Losing this
// week's cache is a smaller failure than a Build tab that cannot open.
export function parseEntries(
  raw: string | null,
  week: number
): Record<string, ParlayEntry> {
  if (!raw) {
    return {}
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {}
  }
  const ready: ParlayEntryStatus = 'ready'
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).filter(
      (pair): pair is [string, ParlayEntry] =>
        isEntry(pair[1]) && pair[1].week === week && pair[1].status === ready
    )
  )
}

export async function loadEntries(
  storage: EntryStorage,
  week: number
): Promise<Record<string, ParlayEntry>> {
  try {
    return parseEntries(await storage.getItem(PARLAY_STORAGE_KEY), week)
  } catch {
    return {}
  }
}

export async function saveEntries(
  storage: EntryStorage,
  entries: Record<string, ParlayEntry>
): Promise<void> {
  try {
    await storage.setItem(PARLAY_STORAGE_KEY, serializeEntries(entries))
  } catch {
    // A failed write costs the user this week's cache on next launch, which is
    // recoverable. Failing the screen over it is not.
  }
}
