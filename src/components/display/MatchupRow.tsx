import { Box, Typography } from '@mui/material'
import React from 'react'
import RankChip from './RankChip'

export interface MatchupRowProps {
  label: string
  homeRank?: number | null
  awayRank?: number | null
  index?: number
}

const MatchupRow: React.FC<MatchupRowProps> = ({
  label,
  homeRank,
  awayRank,
  index = 0,
}) => {
  return (
    <Box
      sx={{
        my: 0.25,
        px: 1,
        py: 0.75,
        borderRadius: 1,
        backgroundColor: index % 2 === 0 ? 'action.hover' : 'transparent',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
        }}
      >
        <Box sx={{ justifySelf: 'start' }}>
          <RankChip rank={awayRank} />
        </Box>
        <Box sx={{ justifySelf: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
        <Box sx={{ justifySelf: 'end' }}>
          <RankChip rank={homeRank} />
        </Box>
      </Box>
    </Box>
  )
}

export default MatchupRow
