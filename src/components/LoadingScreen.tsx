import React from 'react'
import { Box, CircularProgress, Typography, Container } from '@mui/material'
import { TrendingUp as TrendingUpIcon } from '@mui/icons-material'
import ParlAIdLogo from './ParlAIdLogo'

export const LoadingScreen: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <TrendingUpIcon
              sx={{
                fontSize: 60,
                color: '#2e7d32',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': {
                    opacity: 0.6,
                  },
                  '50%': {
                    opacity: 1,
                  },
                  '100%': {
                    opacity: 0.6,
                  },
                },
              }}
            />
          </Box>

          <Box
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 3,
            }}
          >
            <ParlAIdLogo variant="h4" showIcon={false} size="large" />
          </Box>

          <CircularProgress
            size={40}
            sx={{
              color: '#2e7d32',
              mb: 2,
            }}
          />

          <Typography variant="body1" color="text.secondary">
            Loading your account...
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}
