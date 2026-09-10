import type {
  AgentResult,
  Game,
  GeneratedParlay,
  ParlayGenerationOptions,
  ParlayGenerationResult,
} from '../types'

export abstract class BaseParlayService {
  abstract generateParlay(
    game: Game,
    options: ParlayGenerationOptions
  ): Promise<ParlayGenerationResult>

  protected toParlay(
    parlayId: string,
    game: Game,
    result: AgentResult['parlay'],
    model: string
  ): GeneratedParlay {
    return {
      parlayId,
      gameId: game.gameId,
      gameContext: `${game.away.name} @ ${game.home.name} — Week ${game.week}`,
      week: game.week,
      gameDateTime: game.dateTime,
      legs: result.legs,
      combinedOdds: result.combinedOdds,
      parlayConfidence: result.parlayConfidence,
      gameSummary: result.gameSummary,
      model,
    }
  }
}
