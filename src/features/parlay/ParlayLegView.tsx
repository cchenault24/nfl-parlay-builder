import { Person as PersonIcon, Sports as SportsIcon } from '@mui/icons-material'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Typography,
} from '@mui/material'
import React from 'react'
import type { BetType, ParlayLeg } from '../../types'
import { getBetTypeColor, getConfidenceColor } from '../../utils'

interface ParlayLegViewProps extends React.HTMLAttributes<HTMLDivElement> {
  leg: ParlayLeg
  index: number
}

const ParlayLegView: React.FC<ParlayLegViewProps> = ({ leg, index }) => {
  const getBetTypeIcon = (betType: BetType) => {
    switch (betType) {
      case 'player_prop':
        return <PersonIcon />
      case 'spread':
      case 'total':
      case 'moneyline':
      default:
        return <SportsIcon />
    }
  }

  const formatBetTarget = (leg: ParlayLeg) => {
    if (leg.betType === 'player_prop') {
      // If the target already has the correct format, use it
      if (leg.target.includes('(') && leg.target.includes(')')) {
        return leg.target
      }

      // Otherwise, try to format it properly
      const playerName = leg.selection
      const target = leg.target

      // Try to extract the bet details
      const overUnderMatch = target.match(/(Over|Under)\s+([\d.]+)\s+(.+)/)

      if (overUnderMatch && playerName && playerName !== target) {
        const [, overUnder, value, statType] = overUnderMatch
        // We don't have easy access to team name here, so we'll show player name prominently
        return `${playerName} - ${overUnder} ${value} ${statType}`
      }

      // Fallback if parsing fails
      return target
    }

    return leg.target
  }

  return (
    <Grid item xs={12} key={leg.id}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {getBetTypeIcon(leg.betType)}
            <Typography variant="h6" sx={{ ml: 1, flex: 1 }}>
              Leg {index + 1}
              <Chip
                label={leg.odds}
                variant="outlined"
                size="small"
                color="primary"
                sx={{ ml: 2 }}
              />
            </Typography>
            <Chip
              label={leg.betType.replace('_', ' ').toUpperCase()}
              color={getBetTypeColor(leg.betType)}
              size="small"
              sx={{ mr: 1 }}
            />
          </Box>

          <Typography variant="body1" fontWeight="bold" sx={{ mb: 1 }}>
            {formatBetTarget(leg)}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {leg.reasoning}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ mr: 1 }}>
              AI Confidence:
            </Typography>
            <LinearProgress
              variant="determinate"
              value={leg.confidence * 10}
              color={getConfidenceColor(leg.confidence)}
              sx={{ flex: 1, mr: 1 }}
            />
            <Typography variant="caption" fontWeight="bold">
              {leg.confidence}/10
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  )
}

export default ParlayLegView
