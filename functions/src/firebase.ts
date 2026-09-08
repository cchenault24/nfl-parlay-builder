import { getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

export function app(): App {
  return getApps()[0] ?? initializeApp()
}

export const db = () => getFirestore(app())
export const auth = () => getAuth(app())
