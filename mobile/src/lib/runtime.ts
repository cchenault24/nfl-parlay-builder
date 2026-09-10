// React Native's global fetch buffers the whole response and exposes no
// `body` stream, so an SSE feed would only arrive once the run had already
// finished. expo/fetch is the WinterCG implementation and does return a real
// ReadableStream, which is what makes a live step timeline possible at all.
import { fetch as streamingFetch } from 'expo/fetch'
import { configureSharedRuntime } from '@shared/runtime'

import { API_BASE_URL } from '@/lib/api/config'
import { useAuth } from '@/lib/auth/useAuth'
import { auth } from '@/lib/firebase'
import useRateLimitStore from '@/store/rateLimitStore'

// Web uses react-firebase-hooks here; mobile already has an auth context.
const useAuthUser = () => {
  const { user, loading } = useAuth()
  return { uid: user?.uid, loading }
}

// Teaches shared/ the parts of the data layer only this client can answer.
// Runs before the first render so nothing reads it unconfigured.
export function installSharedRuntime(): void {
  configureSharedRuntime({
    baseURL: API_BASE_URL,
    getIdToken: async () => auth.currentUser?.getIdToken(),
    useAuthUser,
    useRateLimitStore,
    streamingFetch,
  })
}
