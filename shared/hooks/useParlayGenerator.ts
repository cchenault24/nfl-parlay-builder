import { useMutation } from '@tanstack/react-query'
import type { BaseParlayService } from '../api/BaseParlayService'
import useParlayStore, { parlayKey } from '../store/parlayStore'
import type { Game } from '../types'
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
  const setResult = useParlayStore(state => state.setResult)
  const failRun = useParlayStore(state => state.failRun)
  const { updateFromResponse } = useRateLimit()

  const mutation = useMutation({
    mutationFn: async ({ games, key }: { games: Game[]; key: string }) => {
      const controller = new AbortController()
      controllers.set(key, controller)
      try {
        return await service.generateParlay(games, {
          riskLevel,
          bookmaker,
          legCount,
          onStep: step => upsertStep(key, step),
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
    },
    onError: (error, { key }) => {
      // A cancel has already cleared the entry; `failRun` is a no-op on a key
      // that is gone, so it does not resurrect one as a failed row.
      failRun(key, error instanceof Error ? error.message : String(error))
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
  const begin = (games: Game[]): string => {
    const key = startRun(
      games[0].week,
      games.map(g => g.gameId)
    )
    return key
  }

  const generate = (games: Game[]): string => {
    const key = begin(games)
    mutation.mutate({ games, key })
    return key
  }

  // Resolves once the run has settled, for a batch that has to create and
  // stream its runs one at a time (CONTRACT §0).
  const generateAsync = async (games: Game[]): Promise<string> => {
    const key = begin(games)
    await mutation.mutateAsync({ games, key })
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
