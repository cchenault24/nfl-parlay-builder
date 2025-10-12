import { Card, CardContent, Typography } from '@mui/material'
import React from 'react'
import useRateLimitStore from '../../store/rateLimitStore'

const ParlayLanding: React.FC = () => {
  const isAtLimit = useRateLimitStore(state => state.isAtLimit)

  // Hide the component when rate limited
  if (isAtLimit()) {
    return null
  }

  return (
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Select a game and click "Create 3-Leg Parlay" to get started
        </Typography>
      </CardContent>
    </Card>
  )
}

export default ParlayLanding
