import { useKeepAwake } from 'expo-keep-awake'

// Rendered only while a run is on screen, so the hook's lifetime is the run's.
// A run lasts up to a few minutes; auto-lock suspends the app, the stream dies
// with it, and a run the server may still finish and bill came back as a
// failure.
export function KeepAwake() {
  useKeepAwake(undefined, { suppressDeactivateWarnings: true })
  return null
}
