import { onSchedule } from 'firebase-functions/v2/scheduler'
import type { AgentRun } from '../agent/shared/schemas'
import { refundUnlessBillable, transitionRun } from '../agent/store/firestore'
import { db } from '../firebase'
import { log } from '../observability/logger'

// A run only makes progress while the request holding its SSE stream open is
// alive, and `maxRunMs` now binds every step, so a healthy run reaches a
// terminal state well inside the api function's own timeout. A run quiet for
// longer than this didn't overrun — its instance went away mid-flight (a
// deploy, an eviction, an OOM, or CPU throttled to zero once the client
// disconnected) and nothing is left to write its outcome.
const STALE_MS = 5 * 60_000

// Both non-terminal statuses leak the same way: a claimed run whose instance
// died stays 'running', and a run whose client never opened the stream stays
// 'queued'.
const STUCK_STATUSES: AgentRun['status'][] = ['queued', 'running']

// Ends runs that stopped making progress. Without this they stay non-terminal
// forever: they can never be re-claimed (`claimRun` only accepts 'queued'), a
// reconnecting client polls a status that will never change, and anything
// counting a user's runs by status counts one that ended long ago.
//
// This only ever writes a terminal state — it never re-runs the agent, which
// stays a deliberate non-goal.
export const reapStaleRunsSweep = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'America/New_York',
    region: 'us-central1',
    // Comfortably above what this needs, and below the schedule interval so
    // a slow sweep can't overlap the next one.
    timeoutSeconds: 120,
    retryCount: 0,
  },
  async () => {
    // `updatedAt` only moves when `status` does — steps are written to a
    // subcollection — so for a claimed run this is the moment it started.
    const cutoff = new Date(Date.now() - STALE_MS).toISOString()
    const snap = await db()
      .collection('agentRuns')
      .where('status', 'in', STUCK_STATUSES)
      .where('updatedAt', '<=', cutoff)
      .get()

    let reaped = 0
    for (const doc of snap.docs) {
      const updates: Partial<AgentRun> = {
        status: 'failed',
        error: {
          code: 'abandoned',
          message:
            'Run stopped making progress and was ended by the stale-run sweep',
        },
      }
      // Atomic and scoped to the statuses we queried, so a run that reached a
      // real outcome between the query and now keeps it. The refund rides the
      // same transaction: a run holds its generation slot from creation, and an
      // abandoned one delivered nothing to charge for — without this, the one
      // failure mode nothing else can clean up is also the one that silently
      // costs a free user a generation.
      const result = await transitionRun(
        doc.id,
        STUCK_STATUSES,
        updates,
        refundUnlessBillable(updates)
      )
      if (result) {
        reaped += 1
      }
    }

    log.info('scheduled.runs.reaped', { found: snap.size, reaped })
  }
)
