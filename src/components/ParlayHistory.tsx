import {
  Casino as CasinoIcon,
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material'
import React, { useEffect, useState } from 'react'
import { requestGrading } from '@shared/api/GradingService'
import { auth, getUserParlays } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import type { GeneratedParlay, LegOutcome, ParlayOutcome } from '../types'
import { formatOdds, getBetTypeColor, getConfidenceColor } from '../utils'
import ShareControl from './display/ShareControl'
import TrackRecord from './display/TrackRecord'

interface ParlayHistoryProps {
  open: boolean
  onClose: () => void
}

const OUTCOME_STYLE: Record<
  ParlayOutcome | 'pending',
  { label: string; color: 'success' | 'error' | 'default' | 'warning' | 'info' }
> = {
  won: { label: 'Won', color: 'success' },
  lost: { label: 'Lost', color: 'error' },
  push: { label: 'Push', color: 'default' },
  partial: { label: 'Partial', color: 'warning' },
  pending: { label: 'Pending', color: 'info' },
}

const LEG_OUTCOME_STYLE: Record<
  LegOutcome,
  { label: string; color: 'success' | 'error' | 'default' | 'warning' }
> = {
  won: { label: 'Won', color: 'success' },
  lost: { label: 'Lost', color: 'error' },
  push: { label: 'Push', color: 'default' },
  ungraded: { label: 'Ungraded', color: 'warning' },
}

const GradingChip: React.FC<{ parlay: GeneratedParlay }> = ({ parlay }) => {
  const outcome = parlay.grading?.status === 'graded' ? parlay.grading.parlayOutcome : 'pending'
  if (!outcome) {
    return null
  }
  const style = OUTCOME_STYLE[outcome]
  return <Chip label={style.label} color={style.color} size="small" sx={{ fontWeight: 600 }} />
}

export const ParlayHistory: React.FC<ParlayHistoryProps> = ({ open, onClose }) => {
  const { user } = useAuth()
  const [parlays, setParlays] = useState<GeneratedParlay[] | null>(null)

  useEffect(() => {
    if (!open || !user) {
      setParlays(null)
      return
    }
    return getUserParlays(user.uid, setParlays)
  }, [open, user])

  useEffect(() => {
    if (!open || !user) {
      return
    }
    auth.currentUser
      ?.getIdToken()
      .then(token => requestGrading(token))
      .catch(() => undefined)
  }, [open, user])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrendingUpIcon />
        <Typography variant="h6" component="span" sx={{ flex: 1 }}>
          Parlay history
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {parlays !== null && parlays.length > 0 && <TrackRecord parlays={parlays} />}
        {parlays === null ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : parlays.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CasinoIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="subtitle1" color="text.secondary">
              No saved parlays yet
            </Typography>
          </Box>
        ) : (
          parlays.map(parlay => (
            <Card key={parlay.parlayId} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                    {parlay.gameContext || 'NFL parlay'}
                  </Typography>
                  <GradingChip parlay={parlay} />
                  <Chip
                    label={formatOdds(parlay.combinedOdds)}
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  />
                  <ShareControl parlay={parlay} />
                </Box>
                {parlay.legs.map((leg, i) => {
                  const legOutcome =
                    parlay.grading?.status === 'graded' ? parlay.grading.legOutcomes?.[i] : undefined
                  return (
                    <Box
                      key={`${parlay.parlayId}-${leg.betType}-${leg.selection}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 1,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Chip
                        label={leg.betType.replace(/_/g, ' ')}
                        color={getBetTypeColor(leg.betType)}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: 'capitalize' }}
                      />
                      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                        {leg.selection}
                      </Typography>
                      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatOdds(leg.odds)}
                      </Typography>
                      {legOutcome && (
                        <Chip
                          label={LEG_OUTCOME_STYLE[legOutcome].label}
                          color={LEG_OUTCOME_STYLE[legOutcome].color}
                          size="small"
                        />
                      )}
                      <Chip
                        label={`${Math.round(leg.confidence * 100)}%`}
                        color={getConfidenceColor(leg.confidence)}
                        size="small"
                        sx={{ fontVariantNumeric: 'tabular-nums' }}
                      />
                    </Box>
                  )
                })}
              </CardContent>
            </Card>
          ))
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
