import express from 'express'
import { cache } from '../cache/CacheClient'
import { log } from '../observability/logger'
import { snapshot } from '../observability/metrics'

export const metricsRouter = express.Router()

// GET /metrics - Expose metrics for monitoring
metricsRouter.get(
  '/metrics',
  async (req: express.Request, res: express.Response) => {
    try {
      const metrics = snapshot()
      const cacheStats = cache.getStats()

      const response = {
        timestamp: new Date().toISOString(),
        metrics: {
          ...metrics,
          cache: {
            ...metrics.cacheStats,
            memorySize: cacheStats.memorySize,
            inflightRequests: cacheStats.inflightRequests,
          },
        },
      }

      res.json(response)
    } catch (error) {
      log.error('metrics.export.error', {
        error: {
          code: 'export_error',
          message: error instanceof Error ? error.message : String(error),
        },
      })

      res.status(500).json({
        error: 'Failed to export metrics',
        timestamp: new Date().toISOString(),
      })
    }
  }
)

// GET /metrics/health - Health check endpoint
metricsRouter.get(
  '/metrics/health',
  async (req: express.Request, res: express.Response) => {
    try {
      const metrics = snapshot()
      const cacheStats = cache.getStats()

      // Basic health checks
      const isHealthy =
        metrics.activeRuns >= 0 && // Not negative
        metrics.cacheStats.hitRate >= 0 && // Valid hit rate
        cacheStats.memorySize >= 0 && // Valid memory size
        cacheStats.inflightRequests >= 0 // Valid inflight count

      const health = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          activeRuns: metrics.activeRuns >= 0,
          cacheHitRate: metrics.cacheStats.hitRate >= 0,
          memorySize: cacheStats.memorySize >= 0,
          inflightRequests: cacheStats.inflightRequests >= 0,
        },
        metrics: {
          activeRuns: metrics.activeRuns,
          cacheHitRate: Math.round(metrics.cacheStats.hitRate * 100) / 100,
          memorySize: cacheStats.memorySize,
          inflightRequests: cacheStats.inflightRequests,
        },
      }

      res.status(isHealthy ? 200 : 503).json(health)
    } catch (error) {
      log.error('metrics.health.error', {
        error: {
          code: 'health_error',
          message: error instanceof Error ? error.message : String(error),
        },
      })

      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      })
    }
  }
)
