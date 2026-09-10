import type { QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { getBoxScore, getGame } from '../providers/espn/client'
import { getSeasonForDate } from '../utils/season'
import { combineParlayOutcome, gradeLeg, type GradableLeg } from './gradeLeg'
import type { ParlayGrading } from './types'

export interface StoredParlay {
  userId?: string
  gameId?: string
  gameDateTime?: string
  legs?: GradableLeg[]
  grading?: ParlayGrading
}

export interface SweepResult {
  checked: number
  graded: number
}

// Grades every parlay in `docs` whose game has finished. A parlay whose game
// is still in progress is marked 'pending' and picked up on a later pass; a
// graded result is final and never recomputed.
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
    if (!data.gameId || !data.gameDateTime || !Array.isArray(data.legs)) {
      continue
    }

    const season = getSeasonForDate(new Date(data.gameDateTime))
    const game = await getGame(season, data.gameId)
    if (!game) {
      continue
    }
    if (game.status !== 'final' || game.homeScore === null || game.awayScore === null) {
      await doc.ref.set(
        { grading: { status: 'pending' } satisfies ParlayGrading },
        { merge: true }
      )
      continue
    }

    const box = await getBoxScore(data.gameId)
    const legOutcomes = data.legs.map(leg =>
      gradeLeg(
        leg,
        {
          homeTeamName: game.home.name,
          awayTeamName: game.away.name,
          homeScore: game.homeScore as number,
          awayScore: game.awayScore as number,
        },
        box
      )
    )
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
