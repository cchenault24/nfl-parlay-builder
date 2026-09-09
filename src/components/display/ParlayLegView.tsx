import { Box, Card, CardContent, Chip, Grid, LinearProgress, Tooltip, Typography } from '@mui/material'
import React from 'react'
import type { ParlayLeg } from '../../types'
import { formatOdds, getBetTypeColor, getConfidenceColor, impliedProbability } from '../../utils'
import TeamLogo from './TeamLogo'

interface ParlayLegViewProps {
  leg: ParlayLeg
  index: number
}

const ParlayLegView: React.FC<ParlayLegViewProps> = ({ leg, index }) => {
  const implied = impliedProbability(leg.odds)
  // Only a real market price implies a fair edge comparison; an unanchored
  // leg's price is the model's own invention, so there's no book to beat.
  const belowImplied = leg.anchored && leg.confidence <= implied

  return (
    <Grid item xs={12}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <TeamLogo teamName={leg.team} size="small" />
            <Typography variant="subtitle2" color="text.secondary">
              Leg {index + 1}
            </Typography>
            <Chip
              label={formatOdds(leg.odds)}
              variant="outlined"
              size="small"
              color="primary"
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            />
            {!leg.anchored && (
              <Tooltip title="No book line for this market — the price is an AI estimate, not a posted odds.">
                <Chip label="Estimate" size="small" color="warning" variant="outlined" />
              </Tooltip>
            )}
            <Chip
              label={leg.betType.replace(/_/g, ' ')}
              color={getBetTypeColor(leg.betType)}
              size="small"
              sx={{ ml: 'auto', textTransform: 'capitalize' }}
            />
          </Box>
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
            {leg.selection}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: '70ch' }}>
            {leg.reasoning}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: belowImplied ? 0.75 : 0 }}>
            <Typography variant="caption" color="text.secondary">
              Confidence
            </Typography>
            <LinearProgress
              variant="determinate"
              value={leg.confidence * 100}
              color={getConfidenceColor(leg.confidence)}
              sx={{ flex: 1, height: 6, borderRadius: 3 }}
            />
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'right' }}
            >
              {Math.round(leg.confidence * 100)}%
            </Typography>
            <Tooltip title="The break-even win rate this price implies.">
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 88, textAlign: 'right' }}
              >
                Implied {Math.round(implied * 100)}%
              </Typography>
            </Tooltip>
          </Box>
          {belowImplied && (
            <Typography variant="caption" color="warning.main">
              Model confidence is at or below the book&apos;s implied probability.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>
  )
}

export default ParlayLegView
