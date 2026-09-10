import { useQuery } from '@tanstack/react-query'
import { sharedRuntime } from '../runtime'
import type { Game, SeasonSummary } from '../types'

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${sharedRuntime().baseURL}${path}`)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string
    } | null
    throw new Error(body?.message ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const useSeasonSummary = () =>
  useQuery({
    queryKey: ['season'],
    queryFn: () => fetchJson<SeasonSummary>('/season'),
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })

export const useSeason = () => useSeasonSummary().data?.season

export const useGamesForWeek = (week: number) =>
  useQuery({
    queryKey: ['games', week],
    queryFn: () => fetchJson<Game[]>(`/games?week=${week}`),
    enabled: week > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })
