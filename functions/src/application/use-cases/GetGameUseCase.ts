import { Game } from '../../domain/entities/Game'
import { GameRepository } from '../../domain/repositories/GameRepository'

export interface GetGameRequest {
  gameId: string
}

export interface GetGameResponse {
  success: boolean
  game?: Game
  error?: string
}

/**
 * GetGameUseCase
 * Handles game retrieval operations
 */
export class GetGameUseCase {
  constructor(private gameRepository: GameRepository) {}

  async execute(request: GetGameRequest): Promise<GetGameResponse> {
    try {
      const game = await this.gameRepository.findById(request.gameId)

      if (!game) {
        return {
          success: false,
          error: 'Game not found',
        }
      }

      return {
        success: true,
        game,
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }
}
