import { Card, CardContent, Typography } from '@mui/material'
import React from 'react'
import useRateLimitStore from '../../store/rateLimitStore'
import ParlayModeToggle from './ParlayModeToggle'

const ParlayLanding: React.FC = () => {
  const isAtLimit = useRateLimitStore(state => state.isAtLimit)

  // Hide the component when rate limited
  if (isAtLimit()) {
    return null
  }

  return (
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Select a game and click &quot;Create 3-Leg Parlay&quot; to get started
        </Typography>

        {import.meta.env.MODE === 'development' && <ParlayModeToggle />}
      </CardContent>
    </Card>
  )
}

export default ParlayLanding
