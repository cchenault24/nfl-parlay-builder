import {
  Login as LoginIcon,
  Psychology as PsychologyIcon,
  Save as SaveIcon,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Typography,
} from '@mui/material'
import React, { useState } from 'react'
import { saveParlayToUser } from '../../config/firebase'
import { useAuth } from '../../hooks/useAuth'
import useModalStore from '../../store/modalStore'
import useParlayStore from '../../store/parlayStore'
import { formatOdds } from '../../utils'
import { AuthModal } from '../auth/AuthModal'
import ErrorBanner from '../ErrorBanner'
import AgentProgress from './AgentProgress'
import GameSummaryView from './GameSummaryView'
import ParlayDisplayFooter from './ParlayDisplayFooter'
import ParlayLegView from './ParlayLegView'

interface ParlayDisplayProps {
  loading: boolean
  isMockMode: boolean
  onCancel: () => void
}

const ParlayDisplay: React.FC<ParlayDisplayProps> = ({
  loading,
  isMockMode,
  onCancel,
}) => {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const parlay = useParlayStore(state => state.parlay)
  const steps = useParlayStore(state => state.steps)
  const sources = useParlayStore(state => state.sources)
  const authModalOpen = useModalStore(state => state.authModalOpen)
  const setAuthModalOpen = useModalStore(state => state.setAuthModalOpen)
  const saveParlaySuccess = useParlayStore(state => state.saveParlaySuccess)
  const saveParlayError = useParlayStore(state => state.saveParlayError)
  const setSaveParlaySuccess = useParlayStore(state => state.setSaveParlaySuccess)
  const setSaveParlayError = useParlayStore(state => state.setSaveParlayError)

  const handleSaveParlay = async () => {
    if (!user) {
      setAuthModalOpen(true)
      return
    }
    if (!parlay) {
      return
    }
    setSaving(true)
    setSaveParlayError('')
    setSaveParlaySuccess(false)
    try {
      await saveParlayToUser(user.uid, parlay)
      setSaveParlaySuccess(true)
      setTimeout(() => setSaveParlaySuccess(false), 3000)
    } catch {
      setSaveParlayError('Failed to save parlay. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AgentProgress steps={steps} isMockMode={isMockMode} onCancel={onCancel} />
    )
  }

  if (!parlay) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ textAlign: 'center', py: 5 }}>
          <Typography variant="body1" color="text.secondary">
            Pick a game above, choose a risk level, and create a 3-leg parlay.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <GameSummaryView gameSummary={parlay.gameSummary} gameContext={parlay.gameContext} />

      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <PsychologyIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              3-leg parlay
            </Typography>
            <Chip
              label={formatOdds(parlay.combinedOdds)}
              color="primary"
              size="small"
              sx={{ ml: 'auto', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
            />
          </Box>

          {sources?.odds !== 'ok' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Book lines were unavailable for this game, so any spread, total, or
              moneyline prices below are AI estimates rather than posted odds.
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {parlay.legs.map((leg, index) => (
              <ParlayLegView
                key={`${parlay.parlayId}-${leg.betType}-${leg.selection}`}
                leg={leg}
                index={index}
              />
            ))}
          </Grid>

          {saveParlaySuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Parlay saved. Find it under Parlay History.
            </Alert>
          )}
          {saveParlayError && (
            <ErrorBanner type="error" title="Failed to save parlay" message={saveParlayError} />
          )}

          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <Button
              variant="outlined"
              startIcon={user ? <SaveIcon /> : <LoginIcon />}
              onClick={handleSaveParlay}
              disabled={saving}
              sx={{ px: 3 }}
            >
              {saving ? 'Saving…' : user ? 'Save parlay' : 'Sign in to save'}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />
          <ParlayDisplayFooter />
        </CardContent>
      </Card>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}

export default ParlayDisplay
