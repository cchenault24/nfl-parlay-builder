import {
  Login as LoginIcon,
  Save as SaveIcon,
  TrendingUp as TrendingUpIcon,
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
import React, { useEffect, useState } from 'react'
import { saveParlayToUser } from '../../config/firebase'
import { useAuth } from '../../hooks/useAuth'
import useModalStore from '../../store/modalStore'
import useParlayStore from '../../store/parlayStore'
import type { GeneratedParlay } from '../../types'
import { AuthModal } from '../auth/AuthModal'
import GameSummaryView from './GameSummaryView'
import ParlayDisplayFooter from './ParlayDisplayFooter'
import ParlayLanding from './ParlayLanding'
import ParlayLegView from './ParlayLegView'
import ParlayLoading from './ParlayLoading'

interface ParlayDisplayProps {
  parlay?: GeneratedParlay
  loading: boolean
}

const ParlayDisplay: React.FC<ParlayDisplayProps> = ({ parlay, loading }) => {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  const setParlay = useParlayStore(state => state.setParlay)
  const authModalOpen = useModalStore(state => state.authModalOpen)
  const setAuthModalOpen = useModalStore(state => state.setAuthModalOpen)
  const saveParlaySuccess = useParlayStore(state => state.saveParlaySuccess)
  const saveParlayError = useParlayStore(state => state.saveParlayError)
  const setSaveParlaySuccess = useParlayStore(
    state => state.setSaveParlaySuccess
  )
  const setSaveParlayError = useParlayStore(state => state.setSaveParlayError)

  useEffect(() => {
    setParlay(parlay || null)
  }, [parlay, setParlay])

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
    } catch (error) {
      setSaveParlayError('Failed to save parlay. Please try again.')
      console.error('Error saving parlay:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <ParlayLoading />
  }

  if (!parlay) {
    return <ParlayLanding />
  }

  return (
    <>
      {parlay.gameSummary && (
        <GameSummaryView
          gameSummary={parlay.gameSummary}
          gameContext={parlay.gameContext}
        />
      )}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <TrendingUpIcon sx={{ mr: 1 }} />
            <Typography variant="h6">AI Generated Parlay</Typography>
            <Box sx={{ ml: 'auto' }}>
              <Chip
                label={`${parlay.combinedOdds > 0 ? '+' : ''}${parlay.combinedOdds}`}
                color="primary"
                variant="outlined"
                size="small"
              />
            </Box>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {parlay.legs.map((leg, index) => (
              <ParlayLegView
                key={`${leg.betType}-${leg.selection}-${leg.odds}`}
                leg={leg}
                index={index}
              />
            ))}
          </Grid>

          {/* Success/Error Messages */}
          {saveParlaySuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Parlay saved successfully! Check your history to view it again.
            </Alert>
          )}

          {saveParlayError && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setSaveParlayError('')}
            >
              {saveParlayError}
            </Alert>
          )}

          {/* Save Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <Button
              variant="outlined"
              startIcon={user ? <SaveIcon /> : <LoginIcon />}
              onClick={handleSaveParlay}
              disabled={saving}
              sx={{
                px: 3,
                py: 1,
                textTransform: 'none',
              }}
            >
              {saving ? 'Saving...' : user ? 'Save Parlay' : 'Sign In to Save'}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Footer */}
          <ParlayDisplayFooter />
        </CardContent>
      </Card>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}

export default ParlayDisplay
