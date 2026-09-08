import express from 'express'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { auth } from '../firebase'
import { errorResponse } from '../utils/errors'

export type AuthedRequest = express.Request & {
  correlationId: string
  user?: Pick<DecodedIdToken, 'uid'>
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
    // Emulator bypass: allow providing a UID via header when running locally
    const isEmulator =
      !!process.env.FUNCTIONS_EMULATOR ||
      !!process.env.FIREBASE_AUTH_EMULATOR_HOST
    const emulatorUid = (req.headers['x-emulator-auth-uid'] as string) || ''
    if (isEmulator && emulatorUid) {
      ;(req as AuthedRequest).user = { uid: emulatorUid }
      return next()
    }

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

    const decoded = await auth().verifyIdToken(token)
    ;(req as AuthedRequest).user = { uid: decoded.uid }
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
