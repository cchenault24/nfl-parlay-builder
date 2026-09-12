import { describe, expect, it, vi } from 'vitest'

vi.mock('../firebase', () => ({ db: () => ({}) }))
vi.mock('../billing/config', () => ({ appleConfigured: () => true, stripeConfigured: () => false }))
vi.mock('../providers/odds/client', () => ({ SUPPORTED_BOOKMAKERS: [] }))

const { scheduledEnd } = await import('./store')

const base = { tier: 'pro' as const, updatedAt: '2026-09-12T00:00:00.000Z' }

describe('scheduledEnd', () => {
  it('hides the period end of a renewing Apple subscription', () => {
    expect(
      scheduledEnd({ ...base, source: 'iap', accessEndsAt: '2026-10-12T00:00:00.000Z', autoRenewing: true })
    ).toBeUndefined()
    expect(scheduledEnd({ ...base, source: 'iap', accessEndsAt: '2026-10-12T00:00:00.000Z' })).toBeUndefined()
  })

  it('shows it once Apple says renewal is off', () => {
    expect(
      scheduledEnd({ ...base, source: 'iap', accessEndsAt: '2026-10-12T00:00:00.000Z', autoRenewing: false })
    ).toBe('2026-10-12T00:00:00.000Z')
  })

  it('shows a Stripe end date, which is only ever set on a scheduled cancellation', () => {
    expect(scheduledEnd({ ...base, source: 'stripe', accessEndsAt: '2026-10-12T00:00:00.000Z' })).toBe(
      '2026-10-12T00:00:00.000Z'
    )
    expect(scheduledEnd({ ...base, source: 'stripe' })).toBeUndefined()
  })
})
