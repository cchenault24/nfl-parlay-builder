// src/config/constants.ts

export const API_CONFIG = {
  ESPN_BASE_URL: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl',
  OPENAI_MODEL: 'gpt-4o-mini',
  OPENAI_TEMPERATURE: 0.7,
  OPENAI_MAX_TOKENS: 1500,
} as const;

export const CACHE_CONFIG = {
  NFL_GAMES_STALE_TIME: 10 * 60 * 1000, // 10 minutes
  NFL_GAMES_GC_TIME: 30 * 60 * 1000,    // 30 minutes
  QUERY_RETRY_COUNT: 1,
} as const;

export const BET_TYPES = {
  SPREAD: 'spread',
  TOTAL: 'total',
  MONEYLINE: 'moneyline', 
  PLAYER_PROP: 'player_prop',
} as const;

export const ROSTER_LIMITS = {
  QB: 2,
  RB: 4,
  WR: 6,
  TE: 3,
} as const;

export const ODDS_RANGES = {
  SPREAD: '-105 to -115',
  TOTALS: '-105 to -115',
  MONEYLINE: '-150 to +130', 
  PLAYER_PROPS: '-110 to -125',
} as const;

export const NFL_RIVALRIES: string[][] = [
  ['Cowboys', 'Eagles'],
  ['Patriots', 'Jets'], 
  ['Packers', 'Bears'],
  ['Ravens', 'Steelers'],
  ['Chiefs', 'Raiders'],
  ['49ers', 'Seahawks'],
];

export const DEFAULTS = {
  PARLAY_LEGS: 3,
  CONFIDENCE_MIN: 1,
  CONFIDENCE_MAX: 10,
  DEFAULT_CONFIDENCE: 6,
  DEFAULT_ODDS: '-110',
  FALLBACK_ODDS: '+525',
} as const;