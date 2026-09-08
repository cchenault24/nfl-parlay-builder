import { createHash } from 'crypto'
import express from 'express'
import * as admin from 'firebase-admin'
import { errorResponse } from '../utils/errors'
import type { AuthedRequest } from './auth'

// Ensure Firebase Admin is initialized before using Firestore.
try {
  admin.app()
} catch {
  admin.initializeApp()
}

const db = admin.firestore()

export type RateLimitRecord = { count: number; windowStart: number }

function rateLimitDocRef(key: string) {
  const id = createHash('sha256').update(key).digest('hex')
  return db
    .collection('rate_limits')
    .doc(id)
    .withConverter<RateLimitRecord>({
      toFirestore: (data: RateLimitRecord) => data,
      fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) =>
        snap.data() as RateLimitRecord,
    })
}

async function checkAndIncrementRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const now = Date.now()
  return await db.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
    const ref = rateLimitDocRef(key)
    const snap = await tx.get(ref)
    if (!snap.exists) {
      tx.set(ref, { count: 1, windowStart: now })
      return true
    }
    const record = snap.data() as RateLimitRecord
    if (now - record.windowStart >= windowMs) {
      tx.set(ref, { count: 1, windowStart: now })
      return true
    }
    if (record.count >= limit) {
      return false
    }
    tx.update(ref, { count: record.count + 1 })
    return true
  })
}

// Limits live in Firestore; the emulator skips them so local runs don't need
// project credentials (the agent routes do the same).
const isEmulator = () =>
  !!process.env.FUNCTIONS_EMULATOR || !!process.env.FIREBASE_AUTH_EMULATOR_HOST

export function rateLimitByIp(limit: number, windowMs: number) {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (isEmulator()) {
      return next()
    }
    const correlationId =
      (req as AuthedRequest).correlationId ||
      `req_${Math.random().toString(36).slice(2)}`
    const ip = req.ip || 'unknown'
    const route = req.path || 'unknown'
    const key = `ip:${ip}:route:${route}:win:${windowMs}`
    const allowed = await checkAndIncrementRateLimit(key, limit, windowMs)
    if (!allowed) {
      return errorResponse(
        res,
        429,
        'rate_limited',
        'Rate limit exceeded',
        correlationId
      )
    }
    next()
  }
}

export function rateLimitByUser(limit: number, windowMs: number) {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const correlationId =
      (req as AuthedRequest).correlationId ||
      `req_${Math.random().toString(36).slice(2)}`
    const user = (req as AuthedRequest).user
    if (!user) {
      return errorResponse(
        res,
        401,
        'unauthorized',
        'Missing user context for rate limit',
        correlationId
      )
    }
    const uid = user.uid
    const route = req.path || 'unknown'
    const key = `user:${uid}:route:${route}:win:${windowMs}`
    const allowed = await checkAndIncrementRateLimit(key, limit, windowMs)
    if (!allowed) {
      return errorResponse(
        res,
        429,
        'rate_limited',
        'Rate limit exceeded',
        correlationId
      )
    }
    next()
  }
}

export async function getRateLimitStatus(
  key: string,
  limit: number,
  windowMs: number
): Promise<{
  remaining: number
  total: number
  resetTime: Date
  currentCount: number
}> {
  const now = Date.now()
  const ref = rateLimitDocRef(key)
  const snap = await ref.get()

  if (!snap.exists) {
    return {
      remaining: limit,
      total: limit,
      resetTime: new Date(now + windowMs),
      currentCount: 0,
    }
  }

  const record = snap.data() as RateLimitRecord
  const windowStart = record.windowStart
  const currentCount = record.count

  // Check if window has expired
  if (now - windowStart >= windowMs) {
    return {
      remaining: limit,
      total: limit,
      resetTime: new Date(now + windowMs),
      currentCount: 0,
    }
  }

  const remaining = Math.max(0, limit - currentCount)
  const resetTime = new Date(windowStart + windowMs)

  return {
    remaining,
    total: limit,
    resetTime,
    currentCount,
  }
}

// Function to get rate limit status for a user
export async function getUserRateLimitStatus(
  uid: string,
  route: string,
  limit: number,
  windowMs: number
): Promise<{
  remaining: number
  total: number
  resetTime: Date
  currentCount: number
}> {
  const key = `user:${uid}:route:${route}:win:${windowMs}`
  return await getRateLimitStatus(key, limit, windowMs)
}
