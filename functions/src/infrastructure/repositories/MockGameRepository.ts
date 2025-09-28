import { Game } from '../../domain/entities/Game'
import { Team } from '../../domain/entities/Team'
import { GameRepository } from '../../domain/repositories/GameRepository'

/**
 * Mock implementation of GameRepository for testing
 */
export class MockGameRepository implements GameRepository {
  private games: Map<string, Game> = new Map()
  private players: Map<string, any> = new Map()

  constructor() {
    this.initializeMockData()
  }

  private initializeMockData(): void {
    // Create mock teams
    const homeTeam = new Team(
      'home-team',
      'HOM',
      'Home Team',
      'Home',
      '#FF0000',
      '#FFFFFF',
      'https://example.com/home-logo.png'
    )

    const awayTeam = new Team(
      'away-team',
      'AWY',
      'Away Team',
      'Away',
      '#0000FF',
      '#FFFFFF',
      'https://example.com/away-logo.png'
    )

    // Create mock game
    const game = new Game('game-1', 1, 1, homeTeam, awayTeam, new Date(), {
      type: {
        id: '1',
        name: 'Scheduled',
        state: 'pre',
        completed: false,
      },
    })

    this.games.set('game-1', game)

    // Create mock players
    const homePlayers = [
      this.createMockPlayer('home-qb-1', 'Home QB', 'QB', homeTeam.id),
      this.createMockPlayer('home-rb-1', 'Home RB', 'RB', homeTeam.id),
      this.createMockPlayer('home-wr-1', 'Home WR', 'WR', homeTeam.id),
    ]

    const awayPlayers = [
      this.createMockPlayer('away-qb-1', 'Away QB', 'QB', awayTeam.id),
      this.createMockPlayer('away-rb-1', 'Away RB', 'RB', awayTeam.id),
      this.createMockPlayer('away-wr-1', 'Away WR', 'WR', awayTeam.id),
    ]

    ;[...homePlayers, ...awayPlayers].forEach(player => {
      this.players.set(player.id, player)
    })
  }

  private createMockPlayer(
    id: string,
    name: string,
    position: string,
    teamId: string
  ): any {
    return {
      id,
      fullName: name,
      displayName: name,
      shortName: name.split(' ')[0],
      position: {
        abbreviation: position,
        displayName: position,
      },
      jersey: '1',
      experience: { years: 3 },
      age: 25,
      status: {
        type: 'active',
        isActive: true,
      },
      teamId,
    }
  }

  // GameRepository implementation
  async save(game: Game): Promise<void> {
    this.games.set(game.id, game)
  }

  async findById(id: string): Promise<Game | null> {
    return this.games.get(id) || null
  }

  async findByWeek(week: number): Promise<Game[]> {
    return Array.from(this.games.values()).filter(game => game.week === week)
  }

  async findBySeasonType(seasonType: number): Promise<Game[]> {
    return Array.from(this.games.values()).filter(
      game => game.seasonType === seasonType
    )
  }

  async findByTeam(teamId: string): Promise<Game[]> {
    return Array.from(this.games.values()).filter(
      game => game.homeTeam.id === teamId || game.awayTeam.id === teamId
    )
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Game[]> {
    return Array.from(this.games.values()).filter(
      game => game.date >= startDate && game.date <= endDate
    )
  }

  async findUpcoming(limit?: number): Promise<Game[]> {
    const now = new Date()
    const upcoming = Array.from(this.games.values())
      .filter(game => game.date > now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    return limit ? upcoming.slice(0, limit) : upcoming
  }

  async findCompleted(limit?: number): Promise<Game[]> {
    const completed = Array.from(this.games.values())
      .filter(game => game.isCompleted())
      .sort((a, b) => b.date.getTime() - a.date.getTime())

    return limit ? completed.slice(0, limit) : completed
  }

  async findInProgress(): Promise<Game[]> {
    return Array.from(this.games.values()).filter(game => game.isInProgress())
  }

  async updateStatus(gameId: string, status: any): Promise<void> {
    const game = this.games.get(gameId)
    if (game) {
      const updatedGame = game.withStatus(status)
      this.games.set(gameId, updatedGame)
    }
  }

  async getStatistics(): Promise<{
    totalGames: number
    completedGames: number
    upcomingGames: number
    inProgressGames: number
    averageGamesPerWeek: number
  }> {
    const games = Array.from(this.games.values())
    const totalGames = games.length
    const completedGames = games.filter(g => g.isCompleted()).length
    const upcomingGames = games.filter(g => g.isScheduled()).length
    const inProgressGames = games.filter(g => g.isInProgress()).length
    const averageGamesPerWeek = totalGames / 18 // Assuming 18 weeks

    return {
      totalGames,
      completedGames,
      upcomingGames,
      inProgressGames,
      averageGamesPerWeek,
    }
  }

  async getTeamSchedule(teamId: string, seasonType?: number): Promise<Game[]> {
    return this.findByTeam(teamId)
  }

  async getDivisionalMatchups(week: number): Promise<Game[]> {
    const games = await this.findByWeek(week)
    return games.filter(game => game.isDivisionalMatchup())
  }

  async getConferenceMatchups(week: number): Promise<Game[]> {
    const games = await this.findByWeek(week)
    return games.filter(game => game.isConferenceMatchup())
  }

  async getCrossConferenceMatchups(week: number): Promise<Game[]> {
    const games = await this.findByWeek(week)
    return games.filter(game => game.isCrossConferenceMatchup())
  }

  // PlayerRepository implementation - separate class needed
}
