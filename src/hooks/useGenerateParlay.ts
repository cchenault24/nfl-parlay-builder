import type { GeneratedParlay, ParlayOptions } from '@npb/shared'
import { useMutation } from '@tanstack/react-query'
import { FunctionsAPI } from '../services/functionsClient'

type Result = {
  success: boolean
  data?: GeneratedParlay
  error?: { message: string }
}

export function useGenerateParlay() {
  return useMutation({
    mutationFn: async (args: {
      gameId: string
      options?: ParlayOptions
    }): Promise<Result> => {
      const resp = await FunctionsAPI.generateParlay(args.gameId, args.options)
      return resp as Result
    },
  })
}
