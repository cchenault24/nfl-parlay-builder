import { db } from '../../firebase'
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
export async function transitionRun(
  runId: string,
  allowedFrom: AgentRun['status'][],
  updates: Partial<AgentRun>
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
export async function finishRun(
  runId: string,
  updates: Partial<AgentRun>
): Promise<boolean> {
  const result = await transitionRun(runId, ['running'], updates)
  return result !== null
}

export async function cancelRun(runId: string): Promise<boolean> {
  const result = await transitionRun(runId, ['queued', 'running'], {
    status: 'canceled',
    error: { code: 'canceled', message: 'Run was canceled' },
  })
  return result !== null
}
