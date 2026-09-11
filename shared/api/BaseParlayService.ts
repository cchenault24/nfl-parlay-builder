import type {
  AgentResult,
  Game,
  GeneratedParlay,
  ParlayGenerationOptions,
  ParlayGenerationResult,
} from '../types'

export abstract class BaseParlayService {
  // Always a list, even for one game. A single-game parlay is a one-game slate
  // and takes exactly the same path.
  abstract generateParlay(
    games: Game[],
    options: ParlayGenerationOptions
  ): Promise<ParlayGenerationResult>

  protected toParlay(
    parlayId: string,
    games: Game[],
    result: AgentResult['parlay'],
    model: string
  ): GeneratedParlay {
    const [first] = games
    return {
      parlayId,
      gameIds: games.map(g => g.gameId),
      // See GeneratedParlay.gameId: firestore.rules requires the field.
      gameId: first.gameId,
      gameContext: gameContextFor(games),
      week: first.week,
      // The earliest kickoff, because that is when the parlay goes live.
      gameDateTime: games
        .map(g => g.dateTime)
        .reduce((earliest, dt) => (dt < earliest ? dt : earliest)),
      legs: result.legs,
      combinedOdds: result.combinedOdds,
      parlayConfidence: result.parlayConfidence,
      gameSummary: result.gameSummary,
      model,
    }
  }
}

// One game reads as the matchup; several read as the list of matchups, which is
// still short enough to render at six games ("CIN @ BAL, KC @ DEN, …").
export function gameContextFor(games: Game[]): string {
  const [first] = games
  if (games.length === 1) {
    return `${first.away.name} @ ${first.home.name} — Week ${first.week}`
  }
  return `${games.map(g => `${g.away.abbrev} @ ${g.home.abbrev}`).join(', ')} — Week ${first.week}`
}
