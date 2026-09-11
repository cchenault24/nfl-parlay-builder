import { betTypeLabel } from '@shared/betColors'
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
import { useEntitlements } from '@shared/hooks/useEntitlements'
import { auth, getUserParlays } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import type { GeneratedParlay, LegOutcome, ParlayOutcome } from '../types'
import { formatOdds, getBetTypeColor, getConfidenceColor } from '../utils'
import ShareControl from './display/ShareControl'
import TrackRecord from './display/TrackRecord'
import UpgradeDialog from './UpgradeDialog'

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
  const { capabilities, entitlements, isLoading } = useEntitlements()
  const [parlays, setParlays] = useState<GeneratedParlay[] | null>(null)
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null)

  // Undefined while entitlements load, and if they fail outright. Showing a
  // user more of their own saved parlays costs nothing, whereas failing closed
  // would hide data they saved, so this one restriction fails open.
  const depth = capabilities?.historyDepth ?? null

  useEffect(() => {
    if (!open || !user) {
      setParlays(null)
      return
    }
    return getUserParlays(user.uid, setParlays, depth)
  }, [open, user, depth])

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
        {parlays !== null && parlays.length > 0 && (
          <TrackRecord
            parlays={parlays}
            locked={capabilities?.performanceRecord === false}
            onUpgrade={() =>
              setUpgradeReason('Your record across every saved parlay is part of Pro.')
            }
          />
        )}
        {parlays === null || isLoading ? (
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
                        label={betTypeLabel(leg.betType)}
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
        {depth !== null && parlays !== null && parlays.length === depth && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Showing your last {depth}.{' '}
            <Box
              component="button"
              type="button"
              onClick={() =>
                setUpgradeReason('Your full history, every season, is part of Pro.')
              }
              sx={{
                border: 0,
                p: 0,
                background: 'none',
                font: 'inherit',
                color: 'secondary.main',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Pro keeps every parlay, every season.
            </Box>
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      <UpgradeDialog
        open={upgradeReason !== null}
        onClose={() => setUpgradeReason(null)}
        canPurchase={entitlements?.billingAvailable.stripe ?? false}
        reason={upgradeReason ?? undefined}
      />
    </Dialog>
  )
}
