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

export function rateLimitByIp(limit: number, windowMs: number) {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
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
    console.info(
      `Rate limiting check for user ${uid}, route: "${route}", key: "${key}"`
    )
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

// Function to clear all rate limits for a specific user
export async function clearUserRateLimits(uid: string): Promise<void> {
  try {
    console.info(`Attempting to clear rate limits for user: ${uid}`)

    // Clear rate limits for the parlay generation route
    // Try different possible route variations that might be used
    const routes = [
      '/parlays/generate',
      'parlays/generate',
      '/parlays/generate/',
      'parlays/generate/',
    ]
    const windowMs = 60 * 60 * 1000 // 1 hour window

    const batch = db.batch()
    let deleteCount = 0

    for (const route of routes) {
      const key = `user:${uid}:route:${route}:win:${windowMs}`
      const ref = rateLimitDocRef(key)
      const doc = await ref.get()

      if (doc.exists) {
        console.info(`Found rate limit document for route: ${route}`)
        batch.delete(ref)
        deleteCount++
      } else {
        console.info(`No rate limit document found for route: ${route}`)
      }
    }

    if (deleteCount > 0) {
      await batch.commit()
      console.info(
        `Successfully cleared ${deleteCount} rate limit records for user ${uid}`
      )
    } else {
      console.info(
        `No rate limit records found for user ${uid} with any of the tried routes`
      )
    }
  } catch (error) {
    console.error('Error clearing user rate limits:', error)
    throw error
  }
}

// Function to clear rate limits for a specific user and route
export async function clearUserRateLimitForRoute(
  uid: string,
  route: string,
  windowMs: number
): Promise<void> {
  try {
    const key = `user:${uid}:route:${route}:win:${windowMs}`
    const ref = rateLimitDocRef(key)
    await ref.delete()
    console.info(`Cleared rate limit for user ${uid} on route ${route}`)
  } catch (error) {
    console.error('Error clearing user rate limit for route:', error)
    throw error
  }
}
