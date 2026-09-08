import { Box, CircularProgress, Typography } from '@mui/material'
import React from 'react'
import ParlAIdLogo from './ParlAIdLogo'

export const LoadingScreen: React.FC = () => (
  <Box
    sx={{
      minHeight: '100vh',
      bgcolor: 'background.default',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      px: 3,
    }}
  >
    <ParlAIdLogo height={{ xs: 72, sm: 96 }} />
    <CircularProgress size={32} />
    <Typography variant="body2" color="text.secondary">
      Loading your account…
    </Typography>
  </Box>
)
