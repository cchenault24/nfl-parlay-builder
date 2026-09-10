import { useMemo } from 'react'
import { deriveCurrentWeek } from '../week'
import { useSeasonSummary } from './useSeason'

export const useDerivedCurrentWeek = () => {
  const { data, isLoading, error } = useSeasonSummary()
  const currentWeek = useMemo(
    () => deriveCurrentWeek(data?.weeks ?? []),
    [data]
  )
  return { currentWeek, isLoading, error }
}
