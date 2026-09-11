import AsyncStorage from '@react-native-async-storage/async-storage'
import useParlayStore from '@shared/store/parlayStore'
import { useEffect, useRef, useState } from 'react'

import { loadEntries, saveEntries } from './persistence'

// Hydrates this week's finished parlays on first mount and writes them back on
// every change. One subscription for the whole app: mounting this twice would
// have the second hydrate race the first one's writes.
export function useParlayPersistence(week: number): { hydrated: boolean } {
  const [hydrated, setHydrated] = useState(false)
  const replaceEntries = useParlayStore(state => state.replaceEntries)
  // `week` can tick over mid-session as games go final. Re-hydrating against the
  // new week is what prunes the old one.
  const hydratedWeek = useRef<number | null>(null)

  useEffect(() => {
    if (week <= 0 || hydratedWeek.current === week) {
      return
    }
    hydratedWeek.current = week
    let active = true
    setHydrated(false)
    loadEntries(AsyncStorage, week).then(entries => {
      if (active) {
        replaceEntries(entries)
        setHydrated(true)
      }
    })
    return () => {
      active = false
    }
  }, [week, replaceEntries])

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
