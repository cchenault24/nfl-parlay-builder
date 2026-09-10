import { configureSharedRuntime } from '@shared/runtime'
import { useAuthState } from 'react-firebase-hooks/auth'
import { API_CONFIG } from './config/api'
import { auth } from './config/firebase'
import useRateLimitStore from './store/rateLimitStore'

const useAuthUser = () => {
  const [user, loading] = useAuthState(auth)
  return { uid: user?.uid, loading }
}

// Teaches shared/ the parts of the data layer only this client can answer.
// Runs before the first render so nothing reads it unconfigured.
export function installSharedRuntime(): void {
  configureSharedRuntime({
    baseURL: API_CONFIG.CLOUD_FUNCTIONS.baseURL,
    getIdToken: async () => auth.currentUser?.getIdToken(),
    useAuthUser,
    useRateLimitStore,
    // Called through rather than passed by reference, so the browser's own
    // fetch is resolved at request time.
    streamingFetch: (url, init) => fetch(url, init),
  })
}
