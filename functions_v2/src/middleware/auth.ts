import express from 'express'
import * as admin from 'firebase-admin'
import { errorResponse } from '../utils/errors'

export type AuthedRequest = express.Request & {
  correlationId: string
  user?: admin.auth.DecodedIdToken
}

export async function verifyAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    `req_${Math.random().toString(36).slice(2)}`
  ;(req as AuthedRequest).correlationId = correlationId
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      // Diagnostics for missing token
      try {
        const origin = req.headers.origin
        const hasAuthHeader = Boolean(req.headers.authorization)
        const adminProjectId = (admin.app().options as { projectId?: string })
          ?.projectId
        const functionProjectId = process.env.GOOGLE_CLOUD_PROJECT
        console.warn('[AUTH] Missing token', {
          correlationId,
          origin,
          hasAuthHeader,
          adminProjectId,
          functionProjectId,
        })
      } catch (error) {
        console.error('[AUTH] Error in missing token diagnostics:', error)
      }
      return errorResponse(
        res,
        401,
        'unauthorized',
        'Missing Bearer token',
        correlationId
      )
    }
    // Best-effort decode of token claims for diagnostics (no secrets required)
    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8')
        const payload = JSON.parse(payloadJson)
        const claimSummary = {
          iss: payload.iss,
          aud: payload.aud,
          sub: payload.sub,
          provider: payload.firebase?.sign_in_provider,
        }
        console.info('[AUTH] Token claim summary', {
          correlationId,
          claimSummary,
        })
      }
    } catch (error) {
      console.error('[AUTH] Error in token claim summary:', error)
    }

    const decoded = await admin.auth().verifyIdToken(token)
    ;(req as AuthedRequest).user = decoded
    return next()
  } catch (err) {
    // Diagnostics for invalid/expired token
    try {
      const origin = req.headers.origin
      const hasAuthHeader = Boolean(req.headers.authorization)
      const tokenLength = (req.headers.authorization || '').startsWith(
        'Bearer '
      )
        ? (req.headers.authorization as string).length - 7
        : 0
      const adminProjectId = (admin.app().options as { projectId?: string })
        ?.projectId
      const functionProjectId = process.env.GOOGLE_CLOUD_PROJECT
      console.warn('[AUTH] Token verification failed', {
        correlationId,
        origin,
        hasAuthHeader,
        tokenLength,
        adminProjectId,
        functionProjectId,
        errorName: (err as Error)?.name,
        errorMessage: (err as Error)?.message,
      })
    } catch (error) {
      console.error('[AUTH] Error in token verification diagnostics:', error)
    }
    return errorResponse(
      res,
      401,
      'unauthorized',
      'Invalid or expired token',
      correlationId
    )
  }
}
