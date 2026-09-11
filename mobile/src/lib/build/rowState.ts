import type { ParlayEntry } from '@shared/store/parlayStore'
import type { Game } from '@shared/types'

// What a row on the Build list is showing. The row carries the game *and* the
// state of its parlay, which is what makes the week shoppable — see DESIGN §4.2.
export type BuildRowState = 'default' | 'running' | 'ready' | 'failed' | 'closed'

export interface BuildRow {
  game: Game
  state: BuildRowState
  entry?: ParlayEntry
}

// A game that has kicked off cannot be built for, whatever happened before.
// Everything else is decided by the entry, and no entry means nothing has been
// spent on this game yet.
export function buildRowFor(game: Game, entry: ParlayEntry | undefined): BuildRow {
  if (game.status !== 'scheduled') {
    return { game, state: 'closed', entry }
  }
  if (!entry) {
    return { game, state: 'default' }
  }
  return { game, state: entry.status, entry }
}
