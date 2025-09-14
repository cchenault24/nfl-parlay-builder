import { useMutation } from '@tanstack/react-query'
import { getParlayService } from '../services/container'
import useParlayStore from '../store/parlayStore'
import { GeneratedParlay, NFLGame } from '../types'
import { RateLimitError } from '../types/errors'
import { useRateLimit } from './useRateLimit'

export const useParlayGenerator = () => {
  const setParlay = useParlayStore(state => state.setParlay)
  const parlayService = getParlayService()

  const mutation = useMutation({
    mutationFn: async (game: NFLGame): Promise<GeneratedParlay> => {
      return await parlayService.generateParlay(game)
    },
    onError: error => {
      console.error('Error generating parlay:', error)

      // Handle rate limit errors specifically
      if (error instanceof RateLimitError) {
        console.warn('Rate limit exceeded:', error.rateLimitInfo)
      }

      // Clear parlay on error
      setParlay(null)
    },
    onSuccess: (data: GeneratedParlay) => {
      console.log('✅ Parlay generated successfully:', data.id)

      // Save parlay to store on success
      setParlay(data)
    },
  })

  // Check if user can generate more parlays
  const canGenerate = () => {
    const rateLimitInfo = useRateLimit().rateLimitInfo
    return !rateLimitInfo || rateLimitInfo.remaining > 0
  }

  // Custom reset that also clears store
  const resetWithStore = () => {
    mutation.reset()
    setParlay(null)
  }

  return {
    mutate: mutation.mutate,
    data: mutation.data,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: resetWithStore,
    isSuccess: mutation.isSuccess,
    canGenerate: canGenerate(),
  }
}
