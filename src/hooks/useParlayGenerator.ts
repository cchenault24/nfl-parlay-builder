import { useMutation } from '@tanstack/react-query'
import { generateParlay } from '../services/openaiService'
import { NFLGame, GeneratedParlay } from '../types'
import useParlayStore from '../store/parlayStore'

export const useParlayGenerator = () => {
  const setParlay = useParlayStore(state => state.setParlay)

  const mutation = useMutation({
    mutationFn: (game: NFLGame) => generateParlay(game),
    onError: error => {
      console.error('Error generating parlay:', error)
      // Clear parlay on error
      setParlay(null)
    },
    onSuccess: (data: GeneratedParlay) => {
      console.log('✅ Parlay generated successfully:', data.id)
      // Save parlay to store on success
      setParlay(data)
    },
  })

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
  }
}
