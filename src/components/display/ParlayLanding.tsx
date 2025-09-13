import { Card, CardContent, Typography } from '@mui/material'
import React from 'react'

const ParlayLanding: React.FC = () => (
  <Card>
    <CardContent sx={{ textAlign: 'center', py: 4 }}>
      <Typography variant="h6" color="text.secondary">
        {`Select a game and click "Create 3-Leg Parlay" to get started`}
      </Typography>
    </CardContent>
  </Card>
)

export default ParlayLanding
