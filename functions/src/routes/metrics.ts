import express from 'express'
import { cache } from '../cache/CacheClient'
import { verifyAuth } from '../middleware/auth'
import { rateLimitByIp } from '../middleware/rateLimit'
import { log } from '../observability/logger'
import { snapshot } from '../observability/metrics'

export const metricsRouter = express.Router()

// Internal diagnostics — require sign-in and rate-limit, since these were
// previously reachable by anyone with no limit at all. Use GET /health for
// an unauthenticated liveness probe.
const guard = [verifyAuth, rateLimitByIp(30, 60_000, 'metrics')]

// GET /metrics - Expose metrics for monitoring
metricsRouter.get(
  '/metrics',
  ...guard,
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
  ...guard,
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

// TEMPORARY diagnostic — remove once the ESPN -> BallsData provider decision
// is settled. Answers one question: can Cloud Run reach these hosts at all,
// or is something in front of them refusing datacenter traffic? Deliberately
// unauthenticated so it can be read without a signed-in session, and it
// returns nothing but reachability: no keys, no payloads. Probing both hosts
// in the same request makes the comparison same-host, same-moment.
metricsRouter.get(
  '/_probe/egress',
  rateLimitByIp(10, 60_000, 'probe_egress'),
  async (_req: express.Request, res: express.Response) => {
    const probe = async (name: string, url: string) => {
      const startedAt = Date.now()
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(8_000) })
        return {
          name,
          status: response.status,
          // Names the edge that answered, which is what identifies a block.
          server: response.headers.get('server'),
          ms: Date.now() - startedAt,
        }
      } catch (err) {
        return {
          name,
          error: err instanceof Error ? err.message : String(err),
          ms: Date.now() - startedAt,
        }
      }
    }
    const results = await Promise.all([
      // No API key: a 401 still proves the request arrived.
      probe('ballsdata', 'https://api.bigballsdata.com/v1/health'),
      probe(
        'espn',
        'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=1'
      ),
    ])
    log.info('probe.egress', { results })
    res.json({ results })
  }
)
