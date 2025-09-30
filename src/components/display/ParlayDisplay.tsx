import { TrendingUp as TrendingUpIcon } from '@mui/icons-material'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Typography,
} from '@mui/material'
import React, { useEffect } from 'react'
import useModalStore from '../../store/modalStore'
import useParlayStore from '../../store/parlayStore'
import type { GeneratedParlay } from '../../types'
import { AuthModal } from '../auth/AuthModal'
import { LegalDisclaimer } from '../legal/LegalDisclaimer' // Add this import
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
  // Store state and actions
  const setParlay = useParlayStore(state => state.setParlay)
  const authModalOpen = useModalStore(state => state.authModalOpen)
  const setAuthModalOpen = useModalStore(state => state.setAuthModalOpen)

  // Sync parlay prop with store whenever it changes
  useEffect(() => {
    setParlay(parlay || null)
  }, [parlay, setParlay])

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

          <Divider sx={{ my: 2 }} />

          {/* Add inline legal disclaimer to parlay results */}
          <Box sx={{ mb: 2 }}>
            <LegalDisclaimer
              variant="inline"
              showResponsibleGamblingLink={true}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Footer now gets parlay from store */}
          <ParlayDisplayFooter />
        </CardContent>
      </Card>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}

export default ParlayDisplay
