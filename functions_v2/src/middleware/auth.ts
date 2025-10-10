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
      return errorResponse(
        res,
        401,
        'unauthorized',
        'Missing Bearer token',
        correlationId
      )
    }

    const decoded = await admin.auth().verifyIdToken(token)
    ;(req as AuthedRequest).user = decoded
    return next()
  } catch {
    return errorResponse(
      res,
      401,
      'unauthorized',
      'Invalid or expired token',
      correlationId
    )
  }
}
