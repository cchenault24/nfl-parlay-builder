// ================================================================================================
// PROVIDER CONFIGURATION - Centralized provider configuration management
// ================================================================================================

import { AIProviderType, DataProviderType } from '../types/providers'

/**
 * Provider configuration for different environments
 */
export interface EnvironmentProviderConfig {
  ai: {
    primary: AIProviderType
    fallback: AIProviderType[]
    providers: {
      [K in AIProviderType]?: {
        enabled: boolean
        priority: number
        config: Record<string, unknown>
      }
    }
  }
  data: {
    primary: DataProviderType
    fallback: DataProviderType[]
    providers: {
      [K in DataProviderType]?: {
        enabled: boolean
        priority: number
        config: Record<string, unknown>
      }
    }
  }
}

/**
 * Provider configuration presets for different environments
 */
export const PROVIDER_CONFIGS: Record<string, EnvironmentProviderConfig> = {
  development: {
    ai: {
      primary: 'mock',
      fallback: ['openai'],
      providers: {
        mock: {
          enabled: true,
          priority: 1,
          config: {
            name: 'mock-ai-dev',
            debugMode: true,
            enableErrorSimulation: false,
            responseDelay: 100,
          },
        },
        openai: {
          enabled: true,
          priority: 2,
          config: {
            name: 'openai-dev',
            model: 'gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 4000,
          },
        },
      },
    },
    data: {
      primary: 'mock',
      fallback: ['espn', 'nfl'],
      providers: {
        mock: {
          enabled: true,
          priority: 1,
          config: {
            name: 'mock-data-dev',
            debugMode: true,
            responseDelay: 50,
          },
        },
        espn: {
          enabled: true,
          priority: 2,
          config: {
            name: 'espn-dev',
            timeout: 30000,
            retries: 3,
          },
        },
        nfl: {
          enabled: true,
          priority: 3,
          config: {
            name: 'nfl-dev',
            timeout: 30000,
            retries: 3,
          },
        },
        sportradar: {
          enabled: false, // Requires API key
          priority: 4,
          config: {
            name: 'sportradar-dev',
            timeout: 30000,
            retries: 3,
          },
        },
      },
    },
  },
  production: {
    ai: {
      primary: 'openai',
      fallback: ['mock'],
      providers: {
        openai: {
          enabled: true,
          priority: 1,
          config: {
            name: 'openai-prod',
            model: 'gpt-4o',
            temperature: 0.7,
            maxTokens: 4000,
            timeout: 30000,
            retries: 3,
          },
        },
        mock: {
          enabled: true,
          priority: 2,
          config: {
            name: 'mock-ai-prod',
            debugMode: false,
            enableErrorSimulation: false,
            responseDelay: 1000,
          },
        },
      },
    },
    data: {
      primary: 'espn',
      fallback: ['nfl', 'sportradar', 'mock'],
      providers: {
        espn: {
          enabled: true,
          priority: 1,
          config: {
            name: 'espn-prod',
            timeout: 30000,
            retries: 3,
            rateLimit: {
              requestsPerMinute: 60,
              requestsPerHour: 1000,
            },
          },
        },
        nfl: {
          enabled: true,
          priority: 2,
          config: {
            name: 'nfl-prod',
            timeout: 30000,
            retries: 3,
          },
        },
        sportradar: {
          enabled: true,
          priority: 3,
          config: {
            name: 'sportradar-prod',
            timeout: 30000,
            retries: 3,
          },
        },
        mock: {
          enabled: true,
          priority: 4,
          config: {
            name: 'mock-data-prod',
            debugMode: false,
            responseDelay: 500,
          },
        },
      },
    },
  },
  testing: {
    ai: {
      primary: 'mock',
      fallback: [],
      providers: {
        mock: {
          enabled: true,
          priority: 1,
          config: {
            name: 'mock-ai-test',
            debugMode: true,
            enableErrorSimulation: true,
            errorRate: 0.1,
            responseDelay: 10,
          },
        },
      },
    },
    data: {
      primary: 'mock',
      fallback: [],
      providers: {
        mock: {
          enabled: true,
          priority: 1,
          config: {
            name: 'mock-data-test',
            debugMode: true,
            responseDelay: 10,
          },
        },
      },
    },
  },
}

/**
 * Get provider configuration for current environment
 */
export function getProviderConfig(): EnvironmentProviderConfig {
  const env = getEnvironment()
  return PROVIDER_CONFIGS[env] || PROVIDER_CONFIGS.development
}

/**
 * Get current environment
 */
function getEnvironment(): string {
  // Check for explicit environment variable
  if (typeof process !== 'undefined' && process.env.NODE_ENV) {
    return process.env.NODE_ENV
  }

  // Check for Vite environment
  if (typeof import.meta !== 'undefined' && import.meta.env?.MODE) {
    return import.meta.env.MODE
  }

  // Default to development
  return 'development'
}

/**
 * Provider selection criteria presets
 */
export const PROVIDER_SELECTION_PRESETS = {
  performance: {
    priority: 'performance' as const,
    fallback: true,
    require: [] as string[],
    exclude: [] as string[],
  },
  reliability: {
    priority: 'reliability' as const,
    fallback: true,
    require: [] as string[],
    exclude: [] as string[],
  },
  cost: {
    priority: 'cost' as const,
    fallback: true,
    require: [] as string[],
    exclude: [] as string[],
  },
  balanced: {
    priority: 'balanced' as const,
    fallback: true,
    require: [] as string[],
    exclude: [] as string[],
  },
} as const

/**
 * Provider health thresholds
 */
export const HEALTH_THRESHOLDS = {
  responseTime: {
    excellent: 1000, // < 1s
    good: 3000, // < 3s
    acceptable: 10000, // < 10s
  },
  successRate: {
    excellent: 0.99, // 99%+
    good: 0.95, // 95%+
    acceptable: 0.9, // 90%+
  },
  uptime: {
    excellent: 0.999, // 99.9%+
    good: 0.99, // 99%+
    acceptable: 0.95, // 95%+
  },
} as const

/**
 * Provider cost thresholds (per request)
 */
export const COST_THRESHOLDS = {
  free: 0,
  low: 0.01, // $0.01
  medium: 0.05, // $0.05
  high: 0.1, // $0.10
} as const
