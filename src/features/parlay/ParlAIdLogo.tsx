import React from 'react'
import { Typography, Box } from '@mui/material'

interface ParlAIdLogoProps {
  variant?: 'h3' | 'h4' | 'h5' | 'h6'
  showIcon?: boolean
  size?: 'small' | 'medium' | 'large'
}

const ParlAIdLogo: React.FC<ParlAIdLogoProps> = ({
  variant = 'h3',
  showIcon = true,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: showIcon ? 1 : 0,
      }}
    >
      <Typography
        variant={variant}
        component="h1"
        sx={{
          fontFamily: '"Orbitron", monospace',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          userSelect: 'none',
        }}
      >
        <Box component="span" sx={{ color: 'white' }}>
          PARL
        </Box>
        <Box component="span" sx={{ color: '#2e7d32' }}>
          ai
        </Box>
        <Box component="span" sx={{ color: 'white' }}>
          D
        </Box>
      </Typography>
    </Box>
  )
}

export default ParlAIdLogo
