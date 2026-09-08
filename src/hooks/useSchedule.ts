import { useQuery } from '@tanstack/react-query'
import { API_CONFIG } from '../config/api'
import type { Game } from '../types'

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_CONFIG.CLOUD_FUNCTIONS.baseURL}${path}`)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(body?.message ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const useSchedule = () =>
  useQuery({
    queryKey: ['schedule'],
    queryFn: () => fetchJson<Game[]>(API_CONFIG.CLOUD_FUNCTIONS.endpoints.schedule),
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })

export const useSeason = () => useSchedule().data?.[0]?.season

export const useGamesForWeek = (week: number) =>
  useQuery({
    queryKey: ['games', week],
    queryFn: () => fetchJson<Game[]>(API_CONFIG.CLOUD_FUNCTIONS.endpoints.games(week)),
    enabled: week > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })
