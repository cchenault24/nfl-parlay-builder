import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import type { BaseParlayService } from '../api/BaseParlayService'
import useParlayStore, { parlayKey } from '../store/parlayStore'
import type { Game } from '../types'
import { useRateLimit } from './useRateLimit'

// One attempt per press: agent failures are surfaced, never retried.
export const useParlayGenerator = (service: BaseParlayService) => {
  const riskLevel = useParlayStore(state => state.riskLevel)
  const bookmaker = useParlayStore(state => state.bookmaker)
  const legCount = useParlayStore(state => state.legCount)
  const startRun = useParlayStore(state => state.startRun)
  const upsertStep = useParlayStore(state => state.upsertStep)
  const setResult = useParlayStore(state => state.setResult)
  const failRun = useParlayStore(state => state.failRun)
  const clearRun = useParlayStore(state => state.clearRun)
  const { updateFromResponse } = useRateLimit()
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const mutation = useMutation({
    mutationFn: async ({ games }: { games: Game[] }) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const key = startRun(
        games[0].week,
        games.map(g => g.gameId)
      )
      const result = await service.generateParlay(games, {
        riskLevel,
        bookmaker,
        legCount,
        onStep: step => upsertStep(key, step),
        signal: controller.signal,
      })
      return { key, result }
    },
    onSuccess: ({ key, result }) => {
      if (result.rateLimitInfo) {
        updateFromResponse(result.rateLimitInfo)
      }
      setResult(key, { parlay: result.parlay, games: result.games })
    },
    onError: (error, { games }) => {
      failRun(
        parlayKey(games[0].week, games.map(g => g.gameId)),
        error instanceof Error ? error.message : String(error)
      )
    },
  })

  const cancel = () => {
    abortRef.current?.abort()
    const games = mutation.variables?.games
    if (games) {
      // A canceled run is not a failure to report — it leaves nothing behind.
      clearRun(parlayKey(games[0].week, games.map(g => g.gameId)))
    }
    mutation.reset()
  }

  return {
    generate: mutation.mutate,
    // Resolves once the run has settled, for a batch that has to create and
    // stream its runs one at a time (CONTRACT §0).
    generateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    cancel,
    activeKey: mutation.variables
      ? parlayKey(
          mutation.variables.games[0].week,
          mutation.variables.games.map(g => g.gameId)
        )
      : null,
  }
}
