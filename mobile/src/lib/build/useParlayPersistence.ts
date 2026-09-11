import AsyncStorage from '@react-native-async-storage/async-storage'
import useParlayStore from '@shared/store/parlayStore'
import { useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth/useAuth'
import { loadEntries, saveEntries } from './persistence'

// Hydrates the finished parlays on first mount and writes them back on every
// change. Mounted once, on the Build list: mounting it twice would have the
// second hydrate race the first one's writes.
//
// `liveWeek` is the derived current week, never the week being browsed. It is
// the floor for what is kept, so looking at next week's slate does not delete
// this week's parlays.
//
// Everything is scoped to the signed-in uid — both the storage key and the
// in-memory store. The store is a module singleton that outlives a sign-out, so
// without the reset below the next account to sign in on the same device would
// see the previous one's parlays until its own hydrate landed, and would see
// them again after an account deletion the server had already honoured.
export function useParlayPersistence(liveWeek: number): { hydrated: boolean } {
  // Which account's data is in the store, rather than a bare boolean. Derived
  // comparison means an account change makes `hydrated` false on the very
  // render it happens, with no effect needed to unset it — so the write
  // subscription below can never persist one user's entries under another's
  // key during the gap before the new hydrate lands.
  const [hydratedUid, setHydratedUid] = useState<string | null>(null)
  const replaceEntries = useParlayStore(state => state.replaceEntries)
  const { user } = useAuth()
  const uid = user?.uid
  const hydrated = Boolean(uid) && hydratedUid === uid

  // The live week can tick over mid-session as games go final, and the account
  // can change underneath a mounted tab. Re-hydrating against either is what
  // prunes the week that just finished and what keeps one user's cache out of
  // another's list.
  const hydratedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!uid) {
      hydratedFor.current = null
      replaceEntries({})
      return
    }
    const target = `${uid}:${liveWeek}`
    if (liveWeek <= 0 || hydratedFor.current === target) {
      return
    }
    hydratedFor.current = target
    let active = true
    loadEntries(AsyncStorage, uid, liveWeek).then(entries => {
      if (!active) {
        return
      }
      // Null means the stored blob was there but unreadable. Leaving the writer
      // disarmed keeps it on disk: this session runs without the cache, and the
      // next launch gets another chance at it. Arming would replace what we
      // could not read with what we could not load.
      if (!entries) {
        return
      }
      replaceEntries(entries)
      setHydratedUid(uid)
    })
    return () => {
      active = false
    }
  }, [uid, liveWeek, replaceEntries])

  useEffect(() => {
    if (!hydrated || !uid) {
      // Writing before the read lands would persist an empty object over a real
      // week's worth of parlays.
      return
    }
    return useParlayStore.subscribe(state => {
      void saveEntries(AsyncStorage, uid, state.entries)
    })
  }, [hydrated, uid])

  return { hydrated }
}
