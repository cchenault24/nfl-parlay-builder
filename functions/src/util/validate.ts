import { GenerateParlayRequest } from '../types'

export function validateGenerateParlayRequest(
  body: any
): { ok: true; data: GenerateParlayRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be an object' }
  }

  if (typeof body.gameId !== 'string' || body.gameId.trim().length === 0) {
    return {
      ok: false,
      error: 'gameId is required and must be a non-empty string',
    }
  }

  if (body.options && typeof body.options !== 'object') {
    return { ok: false, error: 'options must be an object if provided' }
  }

  // Validate options structure if provided
  if (body.options) {
    const { options } = body

    if (options.strategy && typeof options.strategy !== 'string') {
      return { ok: false, error: 'options.strategy must be a string' }
    }

    if (options.variety && typeof options.variety !== 'object') {
      return { ok: false, error: 'options.variety must be an object' }
    }

    if (options.riskTolerance !== undefined) {
      if (
        typeof options.riskTolerance !== 'number' ||
        options.riskTolerance < 0 ||
        options.riskTolerance > 1
      ) {
        return {
          ok: false,
          error: 'options.riskTolerance must be a number between 0 and 1',
        }
      }
    }

    if (options.temperature !== undefined) {
      if (
        typeof options.temperature !== 'number' ||
        options.temperature < 0 ||
        options.temperature > 2
      ) {
        return {
          ok: false,
          error: 'options.temperature must be a number between 0 and 2',
        }
      }
    }

    if (options.maxLegs !== undefined) {
      if (
        !Number.isInteger(options.maxLegs) ||
        options.maxLegs < 1 ||
        options.maxLegs > 10
      ) {
        return {
          ok: false,
          error: 'options.maxLegs must be an integer between 1 and 10',
        }
      }
    }
  }

  return {
    ok: true,
    data: {
      gameId: body.gameId.trim(),
      options: body.options || undefined,
    } as GenerateParlayRequest,
  }
}

/**
 * Validate gameId format specifically
 * @param gameId - The gameId to validate
 * @returns validation result
 */
export function validateGameId(
  gameId: any
): { ok: true; gameId: string } | { ok: false; error: string } {
  if (!gameId) {
    return { ok: false, error: 'gameId is required' }
  }

  if (typeof gameId !== 'string') {
    return { ok: false, error: 'gameId must be a string' }
  }

  const trimmedGameId = gameId.trim()
  if (trimmedGameId.length === 0) {
    return { ok: false, error: 'gameId cannot be empty' }
  }

  // Optional: Add format validation (e.g., must be alphanumeric)
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmedGameId)) {
    return { ok: false, error: 'gameId contains invalid characters' }
  }

  return { ok: true, gameId: trimmedGameId }
}
