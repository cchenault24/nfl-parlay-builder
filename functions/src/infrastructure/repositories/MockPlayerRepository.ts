import { Player } from '../../domain/entities/Player'
import { PlayerRepository } from '../../domain/repositories/PlayerRepository'

/**
 * Mock implementation of PlayerRepository for testing
 */
export class MockPlayerRepository implements PlayerRepository {
  private players: Map<string, any> = new Map()

  constructor() {
    this.initializeMockData()
  }

  private initializeMockData(): void {
    // Create mock players
    const homePlayers = [
      this.createMockPlayer('home-qb-1', 'Home QB', 'QB', 'home-team'),
      this.createMockPlayer('home-rb-1', 'Home RB', 'RB', 'home-team'),
      this.createMockPlayer('home-wr-1', 'Home WR', 'WR', 'home-team'),
    ]

    const awayPlayers = [
      this.createMockPlayer('away-qb-1', 'Away QB', 'QB', 'away-team'),
      this.createMockPlayer('away-rb-1', 'Away RB', 'RB', 'away-team'),
      this.createMockPlayer('away-wr-1', 'Away WR', 'WR', 'away-team'),
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

  async save(player: Player): Promise<void> {
    this.players.set(player.id, player)
  }

  async findById(id: string): Promise<Player | null> {
    return this.players.get(id) || null
  }

  async findByTeam(teamId: string): Promise<Player[]> {
    return Array.from(this.players.values()).filter(
      player => player.teamId === teamId
    )
  }

  async findByPosition(position: string): Promise<Player[]> {
    return Array.from(this.players.values()).filter(
      player => player.position.abbreviation === position
    )
  }

  async findByPositionGroup(positionGroup: string): Promise<Player[]> {
    return Array.from(this.players.values()).filter(player => {
      const pos = player.position.abbreviation.toUpperCase()
      switch (positionGroup) {
        case 'quarterback':
          return pos === 'QB'
        case 'running_back':
          return ['RB', 'FB'].includes(pos)
        case 'receiver':
          return ['WR', 'TE'].includes(pos)
        default:
          return false
      }
    })
  }

  async findActive(): Promise<Player[]> {
    return Array.from(this.players.values()).filter(
      player => player.status.isActive
    )
  }

  async findByExperienceLevel(
    level: 'rookie' | 'young' | 'veteran' | 'elite'
  ): Promise<Player[]> {
    return Array.from(this.players.values()).filter(player => {
      const years = player.experience.years
      switch (level) {
        case 'rookie':
          return years === 0
        case 'young':
          return years <= 3
        case 'veteran':
          return years <= 8
        case 'elite':
          return years > 8
        default:
          return false
      }
    })
  }

  async findEligibleForBetType(betType: string): Promise<Player[]> {
    return Array.from(this.players.values()).filter(player => {
      const pos = player.position.abbreviation.toUpperCase()
      switch (betType) {
        case 'player_passing':
          return pos === 'QB'
        case 'player_rushing':
          return ['QB', 'RB', 'FB'].includes(pos)
        case 'player_receiving':
          return ['WR', 'TE', 'RB', 'FB'].includes(pos)
        default:
          return false
      }
    })
  }

  async updateStatus(playerId: string, status: any): Promise<void> {
    const player = this.players.get(playerId)
    if (player) {
      player.status = { ...player.status, ...status }
      this.players.set(playerId, player)
    }
  }

  async getStatistics(): Promise<{
    totalPlayers: number
    activePlayers: number
    positionDistribution: Record<string, number>
    experienceDistribution: Record<string, number>
  }> {
    const players = Array.from(this.players.values())
    const totalPlayers = players.length
    const activePlayers = players.filter(p => p.status.isActive).length

    const positionDistribution = players.reduce(
      (acc, p) => {
        const pos = p.position.abbreviation
        acc[pos] = (acc[pos] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const experienceDistribution = players.reduce(
      (acc, p) => {
        const years = p.experience.years
        let level = 'rookie'
        if (years > 8) level = 'elite'
        else if (years > 3) level = 'veteran'
        else if (years > 0) level = 'young'

        acc[level] = (acc[level] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      totalPlayers,
      activePlayers,
      positionDistribution,
      experienceDistribution,
    }
  }

  async search(criteria: {
    teamId?: string
    position?: string
    positionGroup?: string
    isActive?: boolean
    experienceLevel?: 'rookie' | 'young' | 'veteran' | 'elite'
    betType?: string
    limit?: number
    offset?: number
  }): Promise<Player[]> {
    let players = Array.from(this.players.values())

    if (criteria.teamId) {
      players = players.filter(p => p.teamId === criteria.teamId)
    }

    if (criteria.position) {
      players = players.filter(
        p => p.position.abbreviation === criteria.position
      )
    }

    if (criteria.isActive !== undefined) {
      players = players.filter(p => p.status.isActive === criteria.isActive)
    }

    if (criteria.limit) {
      players = players.slice(0, criteria.limit)
    }

    return players
  }
}
