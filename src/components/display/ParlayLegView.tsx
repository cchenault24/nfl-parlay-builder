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

interface ParlayLegViewProps extends React.HTMLAttributes<HTMLDivElement> {
  leg: ParlayLeg
  index: number
}

const ParlayLegView: React.FC<ParlayLegViewProps> = ({ leg, index }) => {
  const getBetTypeIcon = (betType: BetType) => {
    switch (betType) {
      // Map any player prop-like bet types to person icon
      case 'player_receptions':
      case 'player_receiving_yards':
      case 'player_receiving_tds':
      case 'player_longest_reception':
      case 'player_rushing_yards':
      case 'player_rushing_attempts':
      case 'player_rushing_tds':
      case 'player_longest_rush':
      case 'player_passing_yards':
      case 'player_passing_attempts':
      case 'player_passing_completions':
      case 'player_passing_tds':
      case 'player_interceptions':
      case 'player_longest_completion':
      case 'player_anytime_td':
      case 'player_first_td':
      case 'player_last_td':
        return <PersonIcon />
      case 'spread':
      case 'total':
      case 'moneyline':
      default:
        return <SportsIcon />
    }
  }

  const getBetTypeColor = (betType: BetType) => {
    switch (betType) {
      case 'spread':
        return 'primary'
      case 'total':
        return 'secondary'
      case 'moneyline':
        return 'success'
      case 'player_receptions':
      case 'player_receiving_yards':
      case 'player_receiving_tds':
      case 'player_longest_reception':
      case 'player_rushing_yards':
      case 'player_rushing_attempts':
      case 'player_rushing_tds':
      case 'player_longest_rush':
      case 'player_passing_yards':
      case 'player_passing_attempts':
      case 'player_passing_completions':
      case 'player_passing_tds':
      case 'player_interceptions':
      case 'player_longest_completion':
      case 'player_anytime_td':
      case 'player_first_td':
      case 'player_last_td':
        return 'info'
      default:
        return 'default'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 8) {
      return 'success'
    }
    if (confidence >= 6) {
      return 'warning'
    }
    return 'error'
  }

  return (
    <Grid item xs={12} key={`${leg.betType}-${leg.selection}-${leg.odds}`}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {getBetTypeIcon(leg.betType)}
            <Typography variant="h6" sx={{ ml: 1, flex: 1 }}>
              Leg {index + 1}
              <Chip
                label={leg.odds > 0 ? `+${leg.odds}` : leg.odds.toString()}
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
            {leg.selection}
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
              value={leg.confidence * 100}
              color={getConfidenceColor(leg.confidence * 10)}
              sx={{ flex: 1, mr: 1 }}
            />
            <Typography variant="caption" fontWeight="bold">
              {Math.round(leg.confidence * 100)}%
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  )
}

export default ParlayLegView
