import AsyncStorage from '@react-native-async-storage/async-storage'
import useParlayStore from '@shared/store/parlayStore'
import { useEffect, useRef, useState } from 'react'

import { loadEntries, saveEntries } from './persistence'

// Hydrates the finished parlays on first mount and writes them back on every
// change. Mounted once, on the Build list: mounting it twice would have the
// second hydrate race the first one's writes.
//
// `liveWeek` is the derived current week, never the week being browsed. It is
// the floor for what is kept, so looking at next week's slate does not delete
// this week's parlays.
export function useParlayPersistence(liveWeek: number): { hydrated: boolean } {
  const [hydrated, setHydrated] = useState(false)
  const replaceEntries = useParlayStore(state => state.replaceEntries)
  // The live week can tick over mid-session as games go final. Re-hydrating
  // against the new one is what prunes the week that just finished.
  const hydratedWeek = useRef<number | null>(null)

  useEffect(() => {
    if (liveWeek <= 0 || hydratedWeek.current === liveWeek) {
      return
    }
    hydratedWeek.current = liveWeek
    let active = true
    setHydrated(false)
    loadEntries(AsyncStorage, liveWeek).then(entries => {
      if (active) {
        replaceEntries(entries)
        setHydrated(true)
      }
    })
    return () => {
      active = false
    }
  }, [liveWeek, replaceEntries])

  useEffect(() => {
    if (!hydrated) {
      // Writing before the read lands would persist an empty object over a real
      // week's worth of parlays.
      return
    }
    return useParlayStore.subscribe(state => {
      void saveEntries(AsyncStorage, state.entries)
    })
  }, [hydrated])

  return { hydrated }
}
