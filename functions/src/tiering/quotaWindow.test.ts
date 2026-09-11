import { describe, expect, it } from 'vitest'
import { quotaWindowEnd, quotaWindowStart } from './capabilities'

// Buckets run Tuesday→Monday in America/New_York. The label is a bucket key and
// the end is a real instant, and conflating the two is what put the advertised
// reset four or five hours before the actual one, every week.

const at = (iso: string) => new Date(iso)

describe('quotaWindowStart', () => {
  it('labels a mid-week instant with the Tuesday it belongs to', () => {
    // Wednesday 2026-09-09, 14:00 ET.
    expect(quotaWindowStart(at('2026-09-09T18:00:00Z'))).toBe('2026-09-08')
  })

  it('starts a new bucket on Tuesday', () => {
    // Monday 23:00 ET is still the old bucket; Tuesday 00:30 ET is the new one.
    expect(quotaWindowStart(at('2026-09-15T03:00:00Z'))).toBe('2026-09-08')
    expect(quotaWindowStart(at('2026-09-15T04:30:00Z'))).toBe('2026-09-15')
  })

  // The boundary has to be the same instant for a user in Los Angeles and for
  // the API in us-central1, or a run counts against different weeks depending
  // on who asks.
  it('is the same label wherever the caller sits', () => {
    // 2026-09-15 21:00 PT is 2026-09-16 00:00 ET — already Wednesday in the
    // bucket's own timezone, and in the same bucket either way.
    expect(quotaWindowStart(at('2026-09-16T04:00:00Z'))).toBe('2026-09-15')
  })

  it('holds across the spring-forward transition', () => {
    expect(quotaWindowStart(at('2026-03-09T12:00:00Z'))).toBe('2026-03-03')
    expect(quotaWindowStart(at('2026-03-10T12:00:00Z'))).toBe('2026-03-10')
  })

  it('holds across the fall-back transition', () => {
    expect(quotaWindowStart(at('2026-11-02T12:00:00Z'))).toBe('2026-10-27')
    expect(quotaWindowStart(at('2026-11-03T12:00:00Z'))).toBe('2026-11-03')
  })
})

describe('quotaWindowEnd', () => {
  // Eastern midnight, not UTC midnight. Under EDT that is 04:00Z.
  it('rolls over at Eastern midnight during daylight time', () => {
    expect(quotaWindowEnd(at('2026-09-09T18:00:00Z'))).toBe('2026-09-15T04:00:00.000Z')
  })

  // And 05:00Z under standard time — the offset is not a constant.
  it('rolls over at Eastern midnight during standard time', () => {
    expect(quotaWindowEnd(at('2026-01-14T18:00:00Z'))).toBe('2026-01-20T05:00:00.000Z')
  })

  // The defect this closes: at 21:00 ET on Monday the old code returned that
  // day's UTC midnight, already three hours past, so the client rendered
  // "Reset available" and "Resets tomorrow" while the server kept refusing.
  it('is still in the future late on the last night of a bucket', () => {
    const lateMonday = at('2026-09-15T01:00:00Z') // Monday 21:00 ET
    expect(Date.parse(quotaWindowEnd(lateMonday))).toBeGreaterThan(
      lateMonday.getTime()
    )
  })

  it('is always in the future, sampled across a whole week', () => {
    for (let hours = 0; hours < 24 * 7; hours += 1) {
      const now = new Date(Date.parse('2026-09-08T05:00:00Z') + hours * 3_600_000)
      expect(Date.parse(quotaWindowEnd(now))).toBeGreaterThan(now.getTime())
    }
  })

  it('names the instant the next bucket label begins', () => {
    const now = at('2026-09-09T18:00:00Z')
    const end = new Date(quotaWindowEnd(now))

    expect(quotaWindowStart(now)).toBe('2026-09-08')
    // One millisecond before the end is still this bucket; the end itself is
    // the next one.
    expect(quotaWindowStart(new Date(end.getTime() - 1))).toBe('2026-09-08')
    expect(quotaWindowStart(end)).toBe('2026-09-15')
  })

  it('spans exactly seven days of wall-clock weeks', () => {
    const start = at('2026-09-09T18:00:00Z')
    const end = Date.parse(quotaWindowEnd(start))
    const nextEnd = Date.parse(quotaWindowEnd(new Date(end)))

    // Seven days apart, and in a week with no transition that is exactly 7×24h.
    expect(nextEnd - end).toBe(7 * 24 * 3_600_000)
  })

  // A bucket containing a transition is 23 or 25 hours longer or shorter in
  // absolute terms, and still ends at local midnight.
  it('still lands on local midnight in a week that changes offset', () => {
    const springEnd = quotaWindowEnd(at('2026-03-09T12:00:00Z'))
    expect(springEnd).toBe('2026-03-10T04:00:00.000Z')

    const fallEnd = quotaWindowEnd(at('2026-10-28T12:00:00Z'))
    expect(fallEnd).toBe('2026-11-03T05:00:00.000Z')
  })
})
