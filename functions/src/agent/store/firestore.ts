import * as admin from 'firebase-admin'
import { AgentRun, AgentRunSchema, AgentStep } from '../shared/schemas'

function getDb(): FirebaseFirestore.Firestore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apps = (admin as any).apps as unknown[] | undefined
  if (!apps || apps.length === 0) {
    try {
      admin.initializeApp()
    } catch {
      // ignore race
    }
  }
  return admin.firestore()
}

export async function createRun(run: AgentRun): Promise<void> {
  const parsed = AgentRunSchema.parse(run)
  await getDb().collection('agentRuns').doc(parsed.id).set(parsed)
}

export async function getRun(runId: string): Promise<AgentRun | null> {
  const snap = await getDb().collection('agentRuns').doc(runId).get()
  if (!snap.exists) {
    return null
  }
  return AgentRunSchema.parse(snap.data())
}

export async function appendStep(
  runId: string,
  step: AgentStep
): Promise<void> {
  const db = getDb()
  await db
    .collection('agentRuns')
    .doc(runId)
    .collection('steps')
    .doc(step.id)
    .set(step)
  await db
    .collection('agentRuns')
    .doc(runId)
    .update({ updatedAt: new Date().toISOString() })
}

export async function listSteps(runId: string): Promise<AgentStep[]> {
  const qs = await getDb()
    .collection('agentRuns')
    .doc(runId)
    .collection('steps')
    .orderBy('startedAt')
    .get()
  return qs.docs.map(d => d.data() as AgentStep)
}

export async function updateRun(
  runId: string,
  updates: Partial<AgentRun>
): Promise<void> {
  await getDb().collection('agentRuns').doc(runId).update(updates)
}
