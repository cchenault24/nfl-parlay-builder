import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { BaseParlayService } from '../api/BaseParlayService'
import useParlayStore, { parlayKey } from '../store/parlayStore'
import { normalizeRunSettings } from '../tiering'
import type { Game } from '../types'
import { ENTITLEMENTS_QUERY_KEY, useEntitlements } from './useEntitlements'
import { useRateLimit } from './useRateLimit'

// Keyed by run, not held in a ref, because the screen that *starts* a run is not
// always the screen that cancels it: generating from game detail pushes parlay
// detail, and the Cancel button lives there. A ref inside one component's hook
// instance is unreachable from the other's.
const controllers = new Map<string, AbortController>()

/**
 * Stops a run from anywhere, and forgets it. A canceled run is not a failure to
 * report — it leaves nothing behind.
 */
export function cancelParlayRun(key: string): void {
  controllers.get(key)?.abort()
  controllers.delete(key)
  useParlayStore.getState().clearRun(key)
}

// One attempt per press: agent failures are surfaced, never retried.
export const useParlayGenerator = (service: BaseParlayService) => {
  const riskLevel = useParlayStore(state => state.riskLevel)
  const bookmaker = useParlayStore(state => state.bookmaker)
  const legCount = useParlayStore(state => state.legCount)
  const startRun = useParlayStore(state => state.startRun)
  const upsertStep = useParlayStore(state => state.upsertStep)
  const setDraft = useParlayStore(state => state.setDraft)
  const setResult = useParlayStore(state => state.setResult)
  const failRun = useParlayStore(state => state.failRun)
  const { updateFromResponse } = useRateLimit()
  const { capabilities } = useEntitlements()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ games, key }: { games: Game[]; key: string }) => {
      const controller = new AbortController()
      controllers.set(key, controller)
      // Clamped here, on the only path to the wire. Settings persist and a plan
      // can lapse underneath them, so what the store holds is a preference and
      // not necessarily something this user may still ask for.
      const settings = normalizeRunSettings(capabilities, {
        riskLevel,
        legCount,
        bookmaker,
      })
      try {
        return await service.generateParlay(games, {
          ...settings,
          onStep: step => upsertStep(key, step),
          onDraft: draft => setDraft(key, draft),
          signal: controller.signal,
        })
      } finally {
        controllers.delete(key)
      }
    },
    onSuccess: (result, { key }) => {
      if (result.rateLimit) {
        updateFromResponse(result.rateLimit)
      }
      setResult(key, { parlay: result.parlay, games: result.games })
      // The server bills a generation inside the same transaction that marks
      // the run succeeded, so the quota on screen is now one behind. Nothing
      // else brings it back: the Build list stays mounted while the stack is
      // pushed over it, so react-query never sees a mount or focus event to
      // refetch on, and the strip can read "1 of 2 left" indefinitely against a
      // server that will refuse the next run.
      void queryClient.invalidateQueries({ queryKey: [ENTITLEMENTS_QUERY_KEY] })
    },
    onError: (error, { key }) => {
      // A cancel has already cleared the entry; `failRun` is a no-op on a key
      // that is gone, so it does not resurrect one as a failed row.
      failRun(key, error instanceof Error ? error.message : String(error))
      // Refetched on failure as well as success. A run holds its quota slot from
      // creation and gives it back when it ends unbilled, so the count on screen
      // moved either way — and on a dropped stream the client cannot tell which
      // happened, which is exactly why it has to ask rather than assert.
      void queryClient.invalidateQueries({ queryKey: [ENTITLEMENTS_QUERY_KEY] })
    },
  })

  /**
   * The run's key, available immediately.
   *
   * The entry is created here rather than inside the mutation so a caller can
   * navigate to it on the next line: react-query runs `mutationFn`
   * asynchronously, and a screen that pushed the parlay route first would have
   * arrived before the entry it is about to render existed.
   */
  const begin = (games: Game[]): { key: string; started: boolean } => {
    const key = parlayKey(
      games[0].week,
      games.map(g => g.gameId)
    )
    // A second start on a running key used to reset its timeline, orphan the
    // first run's controller and reserve a second quota slot. A hook instance's
    // own `isPending` cannot see a run started elsewhere, so the store is the
    // authority on whether one is already in flight.
    if (useParlayStore.getState().entries[key]?.status === 'running') {
      return { key, started: false }
    }
    startRun(games[0].week, games.map(g => g.gameId))
    return { key, started: true }
  }

  const generate = (games: Game[]): string => {
    const { key, started } = begin(games)
    if (started) {
      mutation.mutate({ games, key })
    }
    return key
  }

  // Resolves once the run has settled, for a batch that has to create and
  // stream its runs one at a time (CONTRACT §0).
  const generateAsync = async (games: Game[]): Promise<string> => {
    const { key, started } = begin(games)
    if (started) {
      await mutation.mutateAsync({ games, key })
    }
    return key
  }

  const cancel = () => {
    const key = mutation.variables?.key
    if (key) {
      cancelParlayRun(key)
    }
    mutation.reset()
  }

  // Deliberately no abort-on-unmount. A run now outlives the screen that
  // started it: generating from game detail pushes parlay detail, and popping
  // back to the list must leave the run going, not kill it. Cancelling is an
  // explicit act, and `cancelParlayRun` is reachable from anywhere.

  return {
    generate,
    generateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    cancel,
    activeKey: mutation.variables?.key ?? null,
  }
}

export { parlayKey }
