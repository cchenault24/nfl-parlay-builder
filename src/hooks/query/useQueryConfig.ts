import { UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'

/**
 * Standard query configuration for the application
 */
export const QUERY_CONFIG = {
  // Default stale times
  STALE_TIME: {
    SHORT: 30 * 1000, // 30 seconds
    MEDIUM: 5 * 60 * 1000, // 5 minutes
    LONG: 60 * 60 * 1000, // 1 hour
    VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Default cache times
  CACHE_TIME: {
    SHORT: 5 * 60 * 1000, // 5 minutes
    MEDIUM: 30 * 60 * 1000, // 30 minutes
    LONG: 24 * 60 * 60 * 1000, // 24 hours
    VERY_LONG: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // Retry configuration
  RETRY: {
    DEFAULT: 1,
    NETWORK_ERROR: 3,
    SERVER_ERROR: 2,
    CLIENT_ERROR: 0,
  },

  // Retry delay (exponential backoff)
  RETRY_DELAY: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, 4000),
}

/**
 * Create a standardized query options object
 */
export const createQueryOptions = <TData, TError = Error>(
  options: Partial<UseQueryOptions<TData, TError>> = {}
): UseQueryOptions<TData, TError> => ({
  staleTime: QUERY_CONFIG.STALE_TIME.MEDIUM,
  gcTime: QUERY_CONFIG.CACHE_TIME.MEDIUM,
  retry: QUERY_CONFIG.RETRY.DEFAULT,
  retryDelay: QUERY_CONFIG.RETRY_DELAY,
  refetchOnWindowFocus: false,
  refetchOnMount: true,
  ...options,
})

/**
 * Create a standardized mutation options object
 */
export const createMutationOptions = <TData, TError = Error, TVariables = void>(
  options: Partial<UseMutationOptions<TData, TError, TVariables>> = {}
): UseMutationOptions<TData, TError, TVariables> => ({
  retry: QUERY_CONFIG.RETRY.DEFAULT,
  retryDelay: QUERY_CONFIG.RETRY_DELAY,
  ...options,
})

/**
 * Query keys factory for consistent key generation
 */
export const QUERY_KEYS = {
  // Auth queries
  AUTH: {
    USER: ['auth', 'user'] as const,
    RATE_LIMIT: ['auth', 'rateLimit'] as const,
  },

  // Game queries
  GAMES: {
    ALL: ['games'] as const,
    BY_WEEK: (week: number) => ['games', 'week', week] as const,
    CURRENT_WEEK: ['games', 'currentWeek'] as const,
    AVAILABLE_WEEKS: ['games', 'availableWeeks'] as const,
    ROSTERS: (gameId: string) => ['games', 'rosters', gameId] as const,
    TEAM_ROSTER: (teamId: string) => ['games', 'teamRoster', teamId] as const,
  },

  // Parlay queries
  PARLAYS: {
    ALL: ['parlays'] as const,
    BY_ID: (id: string) => ['parlays', id] as const,
    HISTORY: ['parlays', 'history'] as const,
  },

  // Provider queries
  PROVIDERS: {
    HEALTH: ['providers', 'health'] as const,
    AI_PROVIDERS: ['providers', 'ai'] as const,
    DATA_PROVIDERS: ['providers', 'data'] as const,
    STATS: ['providers', 'stats'] as const,
  },
} as const
