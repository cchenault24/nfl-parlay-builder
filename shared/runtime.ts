import type { RateLimitState } from './store/rateLimitStore'

// A fetch that exposes the response body as a stream. Structural rather than
// `typeof fetch` so the browser's own fetch and expo/fetch both satisfy it
// without shared/ depending on either lib's global types.
export type StreamingFetch = (
  url: string,
  init: { headers: Record<string, string>; signal: AbortSignal }
) => Promise<{
  ok: boolean
  status: number
  body: {
    getReader: () => {
      read: () => Promise<{ done: boolean; value?: Uint8Array }>
    }
  } | null
}>

// The handful of things the shared data layer cannot resolve for itself,
// because each client answers them differently: the web app talks to a
// same-origin `/api` rewrite while the native app needs an absolute host, and
// each has its own Firebase entry point, auth-state source and storage.
//
// Registered once per app before the first render. Every field is read at call
// time, never at module load, so import order between this and the modules
// that use it does not matter.
export type SharedRuntime = {
  baseURL: string
  getIdToken: () => Promise<string | undefined>
  useAuthUser: () => { uid: string | undefined; loading: boolean }
  useRateLimitStore: () => RateLimitState
  // React Native's global fetch buffers the whole response and exposes no
  // `body` stream, so an SSE feed would only arrive once the run had already
  // finished. Native registers expo/fetch, the WinterCG implementation, which
  // is what makes a live step timeline possible at all.
  streamingFetch: StreamingFetch
}

let current: SharedRuntime | undefined

export function configureSharedRuntime(runtime: SharedRuntime): void {
  current = runtime
}

export function sharedRuntime(): SharedRuntime {
  if (!current) {
    throw new Error(
      'configureSharedRuntime() has to run before the shared data layer.'
    )
  }
  return current
}
