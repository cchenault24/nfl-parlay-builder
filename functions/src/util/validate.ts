import type { GenerateParlayRequest } from '@npb/shared'

export function validateGenerateParlayRequest(
  body: any
): { ok: true; data: GenerateParlayRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object')
    return { ok: false, error: 'Body must be an object' }
  if (typeof body.gameId !== 'string' || body.gameId.trim().length === 0) {
    return { ok: false, error: 'gameId is required' }
  }
  if (body.options && typeof body.options !== 'object') {
    return { ok: false, error: 'options must be an object if provided' }
  }
  return { ok: true, data: body as GenerateParlayRequest }
}
