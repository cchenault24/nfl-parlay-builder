// src/hooks/useGenerateParlay.ts - Enhanced version that automatically updates the store
import type { GeneratedParlay, ParlayOptions } from '@npb/shared'
import { useMutation } from '@tanstack/react-query'
import { container } from '../services/container'
import useParlayStore from '../store/parlayStore'

type Vars = { gameId: string; options?: ParlayOptions }

export function useGenerateParlay() {
  const setParlay = useParlayStore(state => state.setParlay)

  return useMutation<GeneratedParlay, Error, Vars>({
    mutationKey: ['generateParlay'],
    mutationFn: async ({ gameId, options }) => {
      return container.parlay.generate(gameId, options)
    },
    onSuccess: data => {
      // Automatically update the parlay store when generation succeeds
      setParlay(data)
    },
    onError: error => {
      console.error('Parlay generation failed:', error)
      // Clear any existing parlay on error
      setParlay(null)
    },
  })
}
