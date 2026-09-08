import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { getParlayService } from '../services/container'
import useParlayStore from '../store/parlayStore'
import type { Game } from '../types'
import { useRateLimit } from './useRateLimit'

// One attempt per click: agent failures are surfaced, never retried.
export const useParlayGenerator = () => {
  const riskLevel = useParlayStore(state => state.riskLevel)
  const upsertStep = useParlayStore(state => state.upsertStep)
  const clearSteps = useParlayStore(state => state.clearSteps)
  const setResult = useParlayStore(state => state.setResult)
  const clearResult = useParlayStore(state => state.clearResult)
  const { updateFromResponse } = useRateLimit()
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const mutation = useMutation({
    mutationFn: async ({ game, useMock }: { game: Game; useMock: boolean }) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      clearSteps()
      clearResult()
      return getParlayService(useMock ? 'mock' : 'agent').generateParlay(game, {
        riskLevel,
        onStep: upsertStep,
        signal: controller.signal,
      })
    },
    onSuccess: data => {
      if (data.rateLimitInfo) {
        updateFromResponse(data.rateLimitInfo)
      }
      setResult(data)
    },
  })

  const cancel = () => {
    abortRef.current?.abort()
    mutation.reset()
  }

  return {
    generate: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    cancel,
    reset: () => {
      cancel()
      clearSteps()
      clearResult()
    },
  }
}
