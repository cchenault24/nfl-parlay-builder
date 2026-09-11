import { useEffect, useState } from 'react'

/**
 * A clock that re-renders its caller on an interval.
 *
 * Returns `now` rather than a derived duration, so what is being timed can be
 * computed during render and a change of subject needs no setState from inside
 * an effect — which the React Compiler forbids anyway.
 *
 * `active` stops the timer for a row that is not timing anything, so an idle
 * Build list is not re-rendering twice a second for nothing.
 */
export function useNow(intervalMs: number, active = true): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) {
      return
    }
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, active])

  return now
}

// Whole-second readouts — an elapsed timer, a countdown. Anything faster
// re-renders without changing a pixel: a six-game run at 250ms re-rendered the
// eight-row timeline 640 times, roughly 480 of them producing identical output,
// while the SSE stream was pushing step updates through the same screen.
export const SECOND_TICK = 500
