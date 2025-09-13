import { APIError } from './APIError'

export class ESPNError extends APIError {
  constructor(
    message: string,
    statusCode?: number,
    endpoint?: string,
    originalError?: Error
  ) {
    super(message, statusCode, endpoint, originalError)
  }

  getUserFriendlyMessage(): string {
    if (this.statusCode === 404) {
      return 'NFL game data not found. This game may not be available yet.'
    }
    if (this.statusCode === 429) {
      return 'Too many requests to NFL data service. Please try again in a moment.'
    }
    if (this.statusCode && this.statusCode >= 500) {
      return 'NFL data service is temporarily unavailable. Please try again later.'
    }
    return 'Unable to fetch NFL game data. Please check your connection and try again.'
  }
}

export class ESPNRosterError extends ESPNError {
  constructor(teamId: string, originalError?: Error) {
    super(
      `Failed to fetch roster for team ${teamId}`,
      undefined,
      `/teams/${teamId}/roster`,
      originalError
    )
  }

  getUserFriendlyMessage(): string {
    return 'Unable to load team roster information. Player props may be limited.'
  }
}

export class ESPNGamesError extends ESPNError {
  constructor(week?: number, originalError?: Error) {
    super(
      `Failed to fetch NFL games for week ${week || 'current'}`,
      undefined,
      '/scoreboard',
      originalError
    )
  }

  getUserFriendlyMessage(): string {
    return 'Unable to load NFL games. Please try again or check your internet connection.'
  }
}
