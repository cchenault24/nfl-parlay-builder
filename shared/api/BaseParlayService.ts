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
    model: string,
    bookmaker: string | null = null
  ): GeneratedParlay {
    const [first] = games
    return {
      parlayId,
      gameIds: games.map(g => g.gameId),
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
      bookmaker,
    }
  }
}

// The book(s) a run priced at, from its per-game odds snapshots. One book is
// the normal case; a cross-game run whose games posted at different books
// names each once.
export function bookmakerFor(games: { odds: { bookmaker: string } | null }[]): string | null {
  const titles = [...new Set(games.map(g => g.odds?.bookmaker).filter((t): t is string => !!t))]
  return titles.length > 0 ? titles.join(', ') : null
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
