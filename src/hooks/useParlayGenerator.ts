import { useMutation } from '@tanstack/react-query'
import { getParlayService } from '../services/container'
import useParlayStore from '../store/parlayStore'
import { NFLGame } from '../types'
import { RateLimitError } from '../types/errors'
import { useRateLimit } from './useRateLimit'

export const useParlayGenerator = () => {
  const setParlay = useParlayStore(state => state.setParlay)
  const parlayService = getParlayService()
  const { updateFromResponse } = useRateLimit()

  const mutation = useMutation({
    mutationFn: async (game: NFLGame) => {
      // Return the full result so we can access it in onSuccess
      return await parlayService.generateParlay(game)
    },
    onError: error => {
      console.error('Error generating parlay:', error)

      // Handle rate limit errors specifically
      if (error instanceof RateLimitError) {
        console.warn('Rate limit exceeded:', error.rateLimitInfo)
        // Update rate limit info from error
        updateFromResponse({ rateLimitInfo: error.rateLimitInfo })
      }

      // Clear parlay on error
      setParlay(null)
    },
    onSuccess: result => {
      // Update rate limit info from response
      if (result.rateLimitInfo) {
        updateFromResponse({ rateLimitInfo: result.rateLimitInfo })
      }

      // Save parlay to store on success
      setParlay(result.parlay)
    },
  })

  // Custom reset that also clears store
  const resetWithStore = () => {
    mutation.reset()
    setParlay(null)
  }

  return {
    mutate: mutation.mutate,
    data: mutation.data?.parlay, // Return just the parlay data
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: resetWithStore,
    isSuccess: mutation.isSuccess,
  }
}
