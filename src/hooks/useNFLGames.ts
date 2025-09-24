import { useQuery } from '@tanstack/react-query'
import { functionsNFLClient } from '../api/clients/FunctionsNFLClient'

export function useNFLGames(week?: number) {
  return useQuery({
    queryKey: ['gamesByWeek', week],
    queryFn: () => {
      if (week === undefined) {
        return Promise.reject(new Error('Week is required'))
      }
      return functionsNFLClient.gamesByWeek(week)
    },
    enabled: week !== undefined, // don’t run until you have a week
  })
}
