import { deriveCurrentWeek } from '@shared/week'
import { useMemo } from 'react'

import { useSeasonSummary } from './useSeason'

export { deriveCurrentWeek }

export const useDerivedCurrentWeek = () => {
  const { data, isLoading, error } = useSeasonSummary()
  const currentWeek = useMemo(() => deriveCurrentWeek(data?.weeks ?? []), [data])
  return { currentWeek, isLoading, error }
}
