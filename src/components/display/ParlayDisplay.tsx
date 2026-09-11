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
import useParlayStore, { type ParlayEntry } from '@shared/store/parlayStore'
import { saveParlayToUser } from '../../config/firebase'
import { useAuth } from '../../hooks/useAuth'
import useModalStore from '../../store/modalStore'
import { formatOdds } from '../../utils'
import { AuthModal } from '../auth/AuthModal'
import ErrorBanner from '../ErrorBanner'
import AgentProgress from './AgentProgress'
import GameSummaryView from './GameSummaryView'
import ParlayDisplayFooter from './ParlayDisplayFooter'
import ParlayLegView from './ParlayLegView'

interface ParlayDisplayProps {
  entry?: ParlayEntry
  loading: boolean
  isMockMode: boolean
  onCancel: () => void
}

const ParlayDisplay: React.FC<ParlayDisplayProps> = ({
  entry,
  loading,
  isMockMode,
  onCancel,
}) => {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [savedParlayId, setSavedParlayId] = useState<string | null>(null)
  const parlay = entry?.status === 'ready' ? entry.parlay : undefined
  const steps = entry?.steps ?? []
  // One matchup label per game, so each analysis card says which game it is
  // about without the analysis having to carry the team names itself.
  const contextFor = (gameId: string) => {
    const game = entry?.games?.find(g => g.game.gameId === gameId)?.game
    return game ? `${game.away.name} @ ${game.home.name} — Week ${game.week}` : ''
  }
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
      setSavedParlayId(parlay.parlayId)
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
      {parlay.gameSummary.slateSummary && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {parlay.gameSummary.slateSummary}
        </Alert>
      )}

      {parlay.gameSummary.games.map(analysis => (
        <GameSummaryView
          key={analysis.gameId}
          analysis={analysis}
          gameContext={contextFor(analysis.gameId) || parlay.gameContext}
        />
      ))}

      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <PsychologyIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {parlay.legs.length}-leg parlay
            </Typography>
            <Chip
              label={formatOdds(parlay.combinedOdds)}
              color="primary"
              size="small"
              sx={{ ml: 'auto', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
            />
          </Box>

          {parlay.legs.some(leg => !leg.anchored) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              One or more legs below are marked &ldquo;Estimate&rdquo; — the book hadn&apos;t
              posted a line for that market, so the price is an AI estimate rather than a
              real one.
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
              disabled={saving || savedParlayId === parlay.parlayId}
              sx={{ px: 3 }}
            >
              {saving
                ? 'Saving…'
                : savedParlayId === parlay.parlayId
                  ? 'Saved'
                  : user
                    ? 'Save parlay'
                    : 'Sign in to save'}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />
          <ParlayDisplayFooter parlay={parlay} />
        </CardContent>
      </Card>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}

export default ParlayDisplay
