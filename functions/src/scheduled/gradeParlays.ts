import { onSchedule } from 'firebase-functions/v2/scheduler'
import { db } from '../firebase'
import { gradeParlayDocs } from '../grading/sweep'
import { log } from '../observability/logger'

// How far back to look for parlays still worth grading. A game older than
// this is either already graded or never will be, so re-reading it every
// hour for the rest of the season is wasted work.
const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000

// Grades finished games without waiting for someone to open their history.
// Until this existed, a saved parlay stayed ungraded indefinitely unless its
// owner happened to look, so the record was only ever as complete as the
// user's browsing habits.
export const gradeParlaysSweep = onSchedule(
  {
    schedule: 'every 60 minutes',
    timeZone: 'America/New_York',
    region: 'us-central1',
    timeoutSeconds: 540,
    retryCount: 0,
  },
  async () => {
    const now = Date.now()
    // Kicked off already, but recent enough to still be worth checking.
    const snap = await db()
      .collection('parlays')
      .where('gameDateTime', '<=', new Date(now).toISOString())
      .where('gameDateTime', '>=', new Date(now - LOOKBACK_MS).toISOString())
      .get()

    const { checked, graded } = await gradeParlayDocs(snap.docs)
    log.info('scheduled.grade.swept', { checked, graded })
  }
)
