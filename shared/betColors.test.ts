import { describe, expect, it } from 'vitest'
import { betTypeLabel } from './betColors'

describe('betTypeLabel', () => {
  it('reads the enum value as a sentence-case label', () => {
    expect(betTypeLabel('player_passing_yards')).toBe('Player passing yards')
    expect(betTypeLabel('moneyline')).toBe('Moneyline')
    expect(betTypeLabel('first_half_spread')).toBe('First half spread')
  })
})
