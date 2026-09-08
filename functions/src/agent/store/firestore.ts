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

export async function updateRun(
  runId: string,
  updates: Partial<AgentRun>
): Promise<void> {
  await runs()
    .doc(runId)
    .update(
      stripUndefined({ ...updates, updatedAt: new Date().toISOString() })
    )
}
