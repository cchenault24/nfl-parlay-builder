// Temporary stub during rearchitecture: no-op rate limiter.
// Remove this file once the new architecture is fully in place.

export class RateLimiter {
  constructor(
    _opts: {
      key?: string
      windowMs?: number
      max?: number
      headers?: boolean
    } = {}
  ) {}

  // Callers can await this; it never throws in the stub.
  async check(
    _identifier?: string
  ): Promise<{ allowed: boolean; remaining?: number; resetMs?: number }> {
    return { allowed: true, remaining: undefined, resetMs: undefined }
  }

  // If callers expect middleware signature, expose a no-op handler.
  handler() {
    return async (_req: any, _res: any, next: any) => next?.()
  }

  dispose(): void {
    // nothing
  }
}

// Keep named export parity if callers import like: import { RateLimiter } from '../middleware/rateLimiter'
export default RateLimiter
