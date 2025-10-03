import { Chip } from '@mui/material'
import React from 'react'

const RankChip: React.FC<{ rank?: number | null }> = ({ rank }) => {
  const getColor = (r?: number | null) => {
    if (!r || r <= 0) return 'default'
    if (r <= 10) return 'success'
    if (r <= 22) return 'warning'
    return 'error'
  }

  const label = rank && rank > 0 ? `${rank}` : 'N/A'
  return (
    <Chip
      label={label}
      color={getColor(rank) as any}
      size="small"
      sx={{
        fontWeight: 700,
        minWidth: 40,
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
