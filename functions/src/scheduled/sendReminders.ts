import { onSchedule } from 'firebase-functions/v2/scheduler'
import { Resend } from 'resend'
import { db } from '../firebase'
import type { StoredParlay } from '../grading/sweep'
import { log } from '../observability/logger'
import { buildReminder } from '../notifications/reminderEmail'

// How far ahead of kickoff to send. Long enough to still act on, short enough
// that the game is the next thing on the recipient's mind.
const LEAD_TIME_MS = 2 * 60 * 60_000
const WINDOW_MS = 30 * 60_000

const APP_URL = 'https://nfl-parlay-builder.web.app'
const FROM = 'ParlAId <noreply@debugdad.com>'

// Stored legs carry the human-readable selection that the grading type has
// no need for, so widen it here rather than in the grading contract.
type RemindableParlay = Omit<StoredParlay, 'legs'> & {
  gameContext?: string
  legs?: Array<{ selection?: string }>
  reminderSentAt?: string
}

// Emails a reminder before kickoff, but only to users who asked for one.
// Nothing here goes out unsolicited: a missing setting means no email, so
// silence is the default for anyone who never opted in.
export const sendKickoffReminders = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'America/New_York',
    region: 'us-central1',
    timeoutSeconds: 300,
    retryCount: 0,
    secrets: ['RESEND_API_KEY'],
  },
  async () => {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      log.warn('scheduled.reminders.skipped', {
        error: { code: 'resend_not_configured', message: 'RESEND_API_KEY is not set' },
      })
      return
    }
    const resend = new Resend(apiKey)

    const windowStart = Date.now() + LEAD_TIME_MS
    const snap = await db()
      .collection('parlays')
      .where('gameDateTime', '>=', new Date(windowStart).toISOString())
      .where('gameDateTime', '<=', new Date(windowStart + WINDOW_MS).toISOString())
      .get()

    let sent = 0
    for (const doc of snap.docs) {
      const parlay = doc.data() as RemindableParlay
      if (parlay.reminderSentAt || !parlay.userId || !Array.isArray(parlay.legs)) {
        continue
      }

      const settings = await db().collection('userSettings').doc(parlay.userId).get()
      if (settings.data()?.kickoffReminders !== true) {
        continue
      }
      const profile = await db().collection('users').doc(parlay.userId).get()
      const email = profile.data()?.email as string | undefined
      if (!email) {
        continue
      }

      const { subject, text } = buildReminder(
        parlay.gameContext ?? 'Your parlay',
        parlay.gameDateTime as string,
        parlay.legs,
        APP_URL
      )
      try {
        await resend.emails.send({ from: FROM, to: email, subject, text })
        // Written only after a successful send, so a failure here retries on
        // the next pass rather than silently swallowing the reminder.
        await doc.ref.set({ reminderSentAt: new Date().toISOString() }, { merge: true })
        sent++
      } catch (err) {
        log.warn('scheduled.reminders.send_failed', {
          error: {
            code: 'reminder_send_failed',
            message: err instanceof Error ? err.message : String(err),
          },
        })
      }
    }
    log.info('scheduled.reminders.sent', { candidates: snap.size, sent })
  }
)
