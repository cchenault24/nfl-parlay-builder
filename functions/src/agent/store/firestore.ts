import type { Transaction } from 'firebase-admin/firestore'
import { db } from '../../firebase'
import { releaseGenerationInTx, reserveGenerationInTx } from '../../tiering/store'
import { AgentRun, AgentRunSchema, AgentStep } from '../shared/schemas'

function runs() {
  return db().collection('agentRuns')
}

function stripUndefined<T extends object>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Creates a run and takes its generation slot in one transaction, or returns
 * false when the user's quota is already spent.
 *
 * The check and the debit have to be the same write. Doing them in separate
 * requests — the old shape, where `resolveRunInput` read `remaining` at POST
 * and `finishRun` debited at success — left a window of seconds to minutes in
 * which every concurrent request read the same `used` and passed.
 *
 * `limit` is the tier's generationsPerWeek; null means unbounded, and the run
 * still records the window so the release path stays uniform.
 */
export async function createRun(
  run: AgentRun,
  limit: number | null
): Promise<boolean> {
  return db().runTransaction(async tx => {
    const windowStart = await reserveGenerationInTx(tx, run.userId, limit)
    if (windowStart === null) {
      return false
    }
    tx.set(
      runs().doc(run.id),
      stripUndefined(AgentRunSchema.parse({ ...run, quotaWindow: windowStart }))
    )
    return true
  })
}

export async function getRun(runId: string): Promise<AgentRun | null> {
  const snap = await runs().doc(runId).get()
  return snap.exists ? AgentRunSchema.parse(snap.data()) : null
}

export async function upsertStep(
  runId: string,
  step: AgentStep
): Promise<void> {
  await runs()
    .doc(runId)
    .collection('steps')
    .doc(step.id)
    .set(stripUndefined(step))
}

export async function listSteps(runId: string): Promise<AgentStep[]> {
  const qs = await runs()
    .doc(runId)
    .collection('steps')
    .orderBy('startedAt')
    .get()
  return qs.docs.map(d => d.data() as AgentStep)
}

// Atomically moves a run from one of `allowedFrom` to the given updates,
// returning the updated run on success or null if the run had already moved
// on (claimed, canceled, or completed by someone else). This is the only
// primitive that changes `status`, so concurrent writers can never clobber
// each other's terminal state.
//
// `alsoInTx` piggybacks extra work on that same transaction. A transition
// succeeds exactly once, so anything done here happens exactly once too —
// which is what makes it safe to bill a generation against a user's quota
// from the same place the run is marked succeeded. It runs before the status
// write because Firestore requires every read in a transaction to precede
// every write, and callers of this hook do read.
export async function transitionRun(
  runId: string,
  allowedFrom: AgentRun['status'][],
  updates: Partial<AgentRun>,
  alsoInTx?: (tx: Transaction, current: AgentRun) => Promise<void>
): Promise<AgentRun | null> {
  return db().runTransaction(async tx => {
    const ref = runs().doc(runId)
    const snap = await tx.get(ref)
    if (!snap.exists) {
      return null
    }
    const current = AgentRunSchema.parse(snap.data())
    if (!allowedFrom.includes(current.status)) {
      return null
    }
    if (alsoInTx) {
      await alsoInTx(tx, current)
    }
    const updatedAt = new Date().toISOString()
    tx.update(ref, stripUndefined({ ...updates, updatedAt }))
    return AgentRunSchema.parse({ ...current, ...updates, updatedAt })
  })
}

// Claims a queued run for execution by this request. Only one caller can
// win, so it is safe to call from every place that might start a run.
export function claimRun(runId: string): Promise<AgentRun | null> {
  return transitionRun(runId, ['queued'], { status: 'running' })
}

// Writes the final outcome of a run, but only if it is still the one
// actively running it — a run already canceled or claimed elsewhere is left
// alone.
//
// A generation is billed against the user's quota here and nowhere else, and
// only when the run both succeeded and got real odds for *every* game in it.
// Everything else is free to the user: failures, cancellations, and successful
// runs that fell back to AI-estimated prices because the odds tool was
// unavailable. At a measured 13% failure rate, charging on start would cost a
// free user a parlay to failure roughly monthly — and a run without anchored
// prices has not delivered what the free tier is defined as being.
//
// "every game" rather than "any game" because the parlay is one product: a
// six-game parlay with one estimated leg is no more fully priced than a
// single-game one with an estimated leg, and charging for it would make the
// existing promise conditional on slate size.
export function isBillable(updates: Partial<AgentRun>): boolean {
  return (
    updates.status === 'succeeded' &&
    !!updates.result &&
    updates.result.games.length > 0 &&
    updates.result.games.every(g => g.sources.odds === 'ok')
  )
}

// Hands the reserved slot back on any terminal outcome that is not billable.
// Exported because the stale-run sweep ends runs too, and a reaped run that
// kept its slot would cost the user a generation for a run that never produced
// anything.
// The slot was taken at creation, so a billable run needs no further write —
// it simply keeps what it already holds.
export function refundUnlessBillable(
  updates: Partial<AgentRun>
): ((tx: Transaction, current: AgentRun) => Promise<void>) | undefined {
  if (isBillable(updates)) {
    return undefined
  }
  return async (tx, current) => {
    if (current.quotaWindow) {
      await releaseGenerationInTx(tx, current.userId, current.quotaWindow)
    }
  }
}

export async function finishRun(
  runId: string,
  updates: Partial<AgentRun>
): Promise<boolean> {
  const result = await transitionRun(
    runId,
    ['running'],
    updates,
    refundUnlessBillable(updates)
  )
  return result !== null
}

export async function cancelRun(runId: string): Promise<boolean> {
  const updates: Partial<AgentRun> = {
    status: 'canceled',
    error: { code: 'canceled', message: 'Run was canceled' },
  }
  const result = await transitionRun(
    runId,
    ['queued', 'running'],
    updates,
    refundUnlessBillable(updates)
  )
  return result !== null
}
