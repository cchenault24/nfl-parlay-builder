import {
  Login as LoginIcon,
  Psychology as PsychologyIcon,
  Save as SaveIcon,
  Speed as SpeedIcon,
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
  useMediaQuery,
  useTheme,
} from '@mui/material'
import React, { useEffect, useState } from 'react'
import { saveParlayToUser } from '../../config/firebase'
import { useAuth } from '../../hooks/useAuth'
import useModalStore from '../../store/modalStore'
import useParlayStore from '../../store/parlayStore'
import type { GameData, GeneratedParlay } from '../../types'
import { AuthModal } from '../auth/AuthModal'
import ErrorBanner from '../ErrorBanner'
import DynamicParlayLoading from './DynamicParlayLoading'
import GameSummaryView from './GameSummaryView'
import ParlayDisplayFooter from './ParlayDisplayFooter'
import ParlayLanding from './ParlayLanding'
import ParlayLegView from './ParlayLegView'
import WeatherDisplay from './WeatherDisplay'

interface ToolResponses {
  weather?: {
    condition: string
    temperatureF: number
    windMph: number
  }
  odds?: {
    moneylineHome: number
    moneylineAway: number
    totalPoints: number
    spreadHome: number
  }
}

interface ParlayDisplayProps {
  parlay?: GeneratedParlay & { gameData?: GameData }
  toolResponses?: ToolResponses
  loading: boolean
  isMockMode?: boolean
  parlayMode?: 'agentic' | 'single-shot'
}

const ParlayDisplay: React.FC<ParlayDisplayProps> = ({
  parlay,
  toolResponses,
  loading,
  isMockMode = false,
  parlayMode = 'agentic',
}) => {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const gameData = useParlayStore(state => state.gameData)
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

  // Scroll to game stats panel when loading completes on mobile
  useEffect(() => {
    if (isMobile && !loading && parlay && gameData) {
      // Small delay to ensure the game stats panel is rendered
      const timer = setTimeout(() => {
        const gameStatsPanel =
          document.querySelector('[data-testid="game-stats-panel"]') ||
          document.querySelector('h2') // Fallback to first h2 (likely game stats title)

        if (gameStatsPanel) {
          // Get the element's position and add padding
          const elementRect = gameStatsPanel.getBoundingClientRect()
          const padding = 20 // 20px padding from top
          const scrollTop = window.pageYOffset + elementRect.top - padding

          // Smooth scroll to position the element at the top with padding
          window.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: 'smooth',
          })
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [loading, parlay, gameData, isMobile])

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
    return <DynamicParlayLoading isMockMode={isMockMode} />
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

      {/* Weather Display */}
      {toolResponses?.weather && (
        <WeatherDisplay weather={toolResponses.weather} />
      )}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            {parlayMode === 'agentic' ? (
              <PsychologyIcon sx={{ mr: 1, color: 'primary.main' }} />
            ) : (
              <SpeedIcon sx={{ mr: 1, color: 'action.active' }} />
            )}
            <Typography variant="h6">
              {parlayMode === 'agentic'
                ? 'AI Agent Generated Parlay'
                : 'AI Generated Parlay'}
            </Typography>
            <Box
              sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}
            >
              <Chip
                label={parlayMode === 'agentic' ? 'Agentic' : 'Single-Shot'}
                color={parlayMode === 'agentic' ? 'primary' : 'default'}
                variant="outlined"
                size="small"
                icon={
                  parlayMode === 'agentic' ? <PsychologyIcon /> : <SpeedIcon />
                }
              />
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
                key={`${parlay.parlayId}-${leg.betType}-${leg.selection}-${leg.odds}-${leg.confidence}`}
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
            <ErrorBanner
              type="error"
              title="Failed to save parlay"
              message={saveParlayError}
            />
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
