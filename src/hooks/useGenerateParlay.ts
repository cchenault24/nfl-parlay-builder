import type { GeneratedParlay, ParlayOptions } from '@npb/shared'
import { useMutation } from '@tanstack/react-query'
import { container } from '../services/container'

type Vars = { gameId: string; options?: ParlayOptions }

export function useGenerateParlay() {
  return useMutation<GeneratedParlay, Error, Vars>({
    mutationKey: ['generateParlay'],
    mutationFn: async ({ gameId, options }) => {
      return container.parlay.generate(gameId, options)
    },
  })
}
