import { Chip } from '@mui/material'
import React from 'react'

const RankChip: React.FC<{ rank?: number | null }> = ({ rank }) => {
  const getColor = (r?: number | null) => {
    if (!r || r <= 0) {
      return 'default'
    }
    if (r <= 10) {
      return 'success'
    }
    if (r <= 22) {
      return 'warning'
    }
    return 'error'
  }

  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10
    const k = num % 100
    if (j === 1 && k !== 11) {
      return 'st'
    }
    if (j === 2 && k !== 12) {
      return 'nd'
    }
    if (j === 3 && k !== 13) {
      return 'rd'
    }
    return 'th'
  }

  const label = rank && rank > 0 ? `${rank}${getOrdinalSuffix(rank)}` : 'N/A'
  return (
    <Chip
      label={label}
      color={getColor(rank) as 'default' | 'success' | 'warning' | 'error'}
      size="small"
      sx={{
        fontWeight: 700,
        width: 50,
        justifyContent: 'center',
        '& .MuiChip-label': {
          textAlign: 'center',
          width: '100%',
        },
      }}
    />
  )
}

export default RankChip
