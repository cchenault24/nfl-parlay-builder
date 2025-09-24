import { Card, CardContent, Typography } from '@mui/material'
import React from 'react'

const ParlayLanding: React.FC = () => (
  <Card>
    <CardContent sx={{ textAlign: 'center', py: 4 }}>
      <Typography variant="h6" color="text.secondary">
        {`Select a game, leg count and click "Create Parlay" to get started`}
      </Typography>
    </CardContent>
  </Card>
)

export default ParlayLanding
