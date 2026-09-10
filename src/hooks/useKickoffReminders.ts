import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { db } from '../config/firebase'
import { useAuth } from './useAuth'

// Opt-in state for pre-kickoff emails. Absent means off: nobody is emailed
// because a document happens not to exist yet.
export function useKickoffReminders() {
  const { user } = useAuth()
  const [enabled, setEnabled] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) {
      setEnabled(false)
      return
    }
    let active = true
    getDoc(doc(db, 'userSettings', user.uid))
      .then(snap => active && setEnabled(snap.data()?.kickoffReminders === true))
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [user])

  const toggle = useCallback(async () => {
    if (!user) {
      return
    }
    const next = !enabled
    setEnabled(next)
    setSaving(true)
    try {
      await setDoc(
        doc(db, 'userSettings', user.uid),
        { kickoffReminders: next },
        { merge: true }
      )
    } catch {
      setEnabled(!next)
    } finally {
      setSaving(false)
    }
  }, [enabled, user])

  return { enabled, toggle, saving }
}
