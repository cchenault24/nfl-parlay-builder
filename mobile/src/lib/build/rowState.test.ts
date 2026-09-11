import { describe, expect, it } from 'vitest'
import type { ParlayEntry } from '@shared/store/parlayStore'
import type { Game } from '@shared/types'
import { buildRowFor } from './rowState'

const game = (overrides: Partial<Game> = {}): Game =>
  ({
    gameId: 'g1',
    season: 2026,
    week: 5,
    dateTime: '2026-10-11T17:00:00Z',
    status: 'scheduled',
    neutralSite: false,
    home: { teamId: 'bal', abbrev: 'BAL', name: 'Baltimore Ravens', record: '3-1', homeRecord: '2-0', roadRecord: '1-1' },
    away: { teamId: 'cin', abbrev: 'CIN', name: 'Cincinnati Bengals', record: '2-2', homeRecord: '1-1', roadRecord: '1-1' },
    venue: null,
    weather: null,
    homeScore: null,
    awayScore: null,
    ...overrides,
  }) as Game

const entry = (status: ParlayEntry['status']): ParlayEntry => ({
  key: '5:g1',
  week: 5,
  gameIds: ['g1'],
  status,
  steps: [],
  startedAt: 0,
})

describe('buildRowFor', () => {
  it('is default with nothing spent on the game', () => {
    expect(buildRowFor(game(), undefined).state).toBe('default')
  })

  it.each(['running', 'ready', 'failed'] as const)('follows the entry when %s', status => {
    expect(buildRowFor(game(), entry(status)).state).toBe(status)
  })

  it.each(['in_progress', 'final', 'postponed'] as const)(
    'is closed once the game is %s',
    status => {
      expect(buildRowFor(game({ status }), undefined).state).toBe('closed')
    }
  )

  it('stays closed even with a parlay already built, and keeps it reachable', () => {
    const row = buildRowFor(game({ status: 'final' }), entry('ready'))
    expect(row.state).toBe('closed')
    expect(row.entry?.status).toBe('ready')
  })
})
