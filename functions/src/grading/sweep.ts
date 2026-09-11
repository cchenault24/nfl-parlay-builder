import type { QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { getBoxScore, getGame } from '../providers/espn/client'
import type { GameBoxScore, ScheduleGame } from '../providers/espn/types'
import { getSeasonForDate } from '../utils/season'
import { combineParlayOutcome, gradeLeg, type GradableLeg } from './gradeLeg'
import type { ParlayGrading } from './types'

export interface StoredParlay {
  userId?: string
  // The game a parlay is filed under — `gameIds[0]`, and the only game for a
  // single-game parlay. firestore.rules requires it on create.
  gameId?: string
  // Every game the parlay draws on. Absent on saves from before cross-game
  // parlays existed, which is what `parlayGameIds` is for.
  gameIds?: string[]
  // The earliest kickoff among those games.
  gameDateTime?: string
  legs?: GradableLeg[]
  grading?: ParlayGrading
}

export interface SweepResult {
  checked: number
  graded: number
}

export function parlayGameIds(data: StoredParlay): string[] {
  if (data.gameIds?.length) {
    return data.gameIds
  }
  return data.gameId ? [data.gameId] : []
}

// Which of the parlay's games each leg belongs to. A team plays once a week, so
// the team name is enough — the same derivation the agent uses when it prices
// the leg in the first place.
function teamToGame(games: ScheduleGame[]): Map<string, ScheduleGame> {
  const map = new Map<string, ScheduleGame>()
  for (const game of games) {
    map.set(game.home.name, game)
    map.set(game.away.name, game)
  }
  return map
}

function isFinal(
  game: ScheduleGame
): game is ScheduleGame & { homeScore: number; awayScore: number } {
  return game.status === 'final' && game.homeScore !== null && game.awayScore !== null
}

// Grades every parlay in `docs` whose games have all finished. A parlay with a
// game still in progress is marked 'pending' and picked up on a later pass; a
// graded result is final and never recomputed.
//
// A cross-game parlay is graded per leg against that leg's own game, and is only
// graded once every game in it is final — a parlay half-decided is not decided.
//
// Shared by the on-demand route and the scheduled sweep so the two can never
// disagree about what an outcome means.
export async function gradeParlayDocs(
  docs: QueryDocumentSnapshot[]
): Promise<SweepResult> {
  let graded = 0

  for (const doc of docs) {
    const data = doc.data() as StoredParlay
    if (data.grading?.status === 'graded') {
      continue
    }
    const gameIds = parlayGameIds(data)
    if (gameIds.length === 0 || !data.gameDateTime || !Array.isArray(data.legs)) {
      continue
    }

    const season = getSeasonForDate(new Date(data.gameDateTime))
    const loaded = await Promise.all(gameIds.map(id => getGame(season, id)))
    const games = loaded.filter((g): g is ScheduleGame => g !== null)
    if (games.length !== gameIds.length) {
      continue
    }
    if (!games.every(isFinal)) {
      await doc.ref.set(
        { grading: { status: 'pending' } satisfies ParlayGrading },
        { merge: true }
      )
      continue
    }

    const boxes = new Map<string, GameBoxScore | null>(
      await Promise.all(
        games.map(async g => [g.gameId, await getBoxScore(g.gameId)] as const)
      )
    )
    const gameForTeam = teamToGame(games)
    const legOutcomes = data.legs.map(leg => {
      const game = gameForTeam.get(leg.team)
      // A leg naming a team in none of the parlay's games cannot be decided
      // here, and guessing which game it meant would risk a wrong verdict.
      if (!game || !isFinal(game)) {
        return 'ungraded' as const
      }
      return gradeLeg(
        leg,
        {
          homeTeamName: game.home.name,
          awayTeamName: game.away.name,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
        },
        boxes.get(game.gameId) ?? null
      )
    })
    const grading: ParlayGrading = {
      status: 'graded',
      gradedAt: new Date().toISOString(),
      legOutcomes,
      parlayOutcome: combineParlayOutcome(legOutcomes),
    }
    await doc.ref.set({ grading }, { merge: true })
    graded++
  }

  return { checked: docs.length, graded }
}
