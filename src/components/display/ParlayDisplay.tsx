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
import type { ParlayLeg } from '../../types'
import { AuthModal } from '../auth/AuthModal'
import { LegalDisclaimer } from '../legal/LegalDisclaimer' // Add this import
import GameSummaryView from './GameSummaryView'
import ParlayDisplayFooter from './ParlayDisplayFooter'
import ParlayLanding from './ParlayLanding'
import ParlayLegView from './ParlayLegView'
import ParlayLoading from './ParlayLoading'

interface ParlayDisplayProps {
  loading: boolean
}

const ParlayDisplay: React.FC<ParlayDisplayProps> = ({ loading }) => {
  // Store state and actions
  const parlay = useParlayStore(state => state.parlay)
  const setParlay = useParlayStore(state => state.setParlay)
  const authModalOpen = useModalStore(state => state.authModalOpen)
  const setAuthModalOpen = useModalStore(state => state.setAuthModalOpen)

  // Sync parlay prop with store whenever it changes
  useEffect(() => {
    setParlay(parlay || null)
  }, [parlay, setParlay])

  const uiLegs = React.useMemo<ParlayLeg[]>(() => {
    if (!parlay) {
      return []
    }
    return parlay.legs.map((leg, index) => ({
      id: `${parlay.gameId ?? 'game'}-L${index + 1}`,
      betType: leg.type as ParlayLeg['betType'],
      selection: leg.selection,
      target: leg.threshold != null ? String(leg.threshold) : '',
      reasoning: leg.rationale ?? '',
      confidence: 0,
      odds: leg.price != null ? String(leg.price) : '',
    }))
  }, [parlay])

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
          gameContext={parlay.gameContext ?? ''}
        />
      )}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <TrendingUpIcon sx={{ mr: 1 }} />
            <Typography variant="h6">AI Generated Parlay</Typography>
            <Box sx={{ ml: 'auto' }}>
              {parlay.estimatedOdds && (
                <Chip
                  label={String(parlay.estimatedOdds)}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {uiLegs.map((leg, index) => (
              <ParlayLegView key={leg.id} leg={leg} index={index} />
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
