import type { Transaction } from 'firebase-admin/firestore'
import { db } from '../../firebase'
import { commitGenerationInTx } from '../../tiering/store'
import { AgentRun, AgentRunSchema, AgentStep } from '../shared/schemas'

function runs() {
  return db().collection('agentRuns')
}

function stripUndefined<T extends object>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export async function createRun(run: AgentRun): Promise<void> {
  await runs().doc(run.id).set(stripUndefined(AgentRunSchema.parse(run)))
}

export async function getRun(runId: string): Promise<AgentRun | null> {
  const snap = await runs().doc(runId).get()
  return snap.exists ? AgentRunSchema.parse(snap.data()) : null
}

export async function upsertStep(runId: string, step: AgentStep): Promise<void> {
  await runs()
    .doc(runId)
    .collection('steps')
    .doc(step.id)
    .set(stripUndefined(step))
}

export async function listSteps(runId: string): Promise<AgentStep[]> {
  const qs = await runs().doc(runId).collection('steps').orderBy('startedAt').get()
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
// only when the run both succeeded and got real odds. Everything else is free
// to the user: failures, cancellations, and successful runs that fell back to
// AI-estimated prices because the odds tool was unavailable. At a measured 13%
// failure rate, charging on start would cost a free user a parlay to failure
// roughly monthly — and a run without anchored prices has not delivered what
// the free tier is defined as being.
export async function finishRun(
  runId: string,
  updates: Partial<AgentRun>
): Promise<boolean> {
  const billable =
    updates.status === 'succeeded' && updates.result?.sources.odds === 'ok'
  const result = await transitionRun(
    runId,
    ['running'],
    updates,
    billable
      ? async (tx, current) => commitGenerationInTx(tx, current.userId)
      : undefined
  )
  return result !== null
}

export async function cancelRun(runId: string): Promise<boolean> {
  const result = await transitionRun(runId, ['queued', 'running'], {
    status: 'canceled',
    error: { code: 'canceled', message: 'Run was canceled' },
  })
  return result !== null
}
