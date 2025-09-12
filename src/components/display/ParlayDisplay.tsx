import React, { useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Grid,
  Divider,
} from '@mui/material'
import { TrendingUp as TrendingUpIcon } from '@mui/icons-material'
import type { GeneratedParlay } from '../../types'
import { AuthModal } from '../auth/AuthModal'
import ParlayLoading from './ParlayLoading'
import ParlayLanding from './ParlayLanding'
import ParlayLegView from './ParlayLegView'
import ParlayDisplayFooter from './ParlayDisplayFooter'
import useParlayStore from '../../store/parlayStore'
import useModalStore from '../../store/modalStore'

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
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <TrendingUpIcon sx={{ mr: 1 }} />
            <Typography variant="h6">AI Generated Parlay</Typography>
            <Box sx={{ ml: 'auto' }}>
              <Chip
                label={parlay.estimatedOdds}
                color="primary"
                variant="outlined"
                size="small"
              />
            </Box>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {parlay.legs.map((leg, index) => (
              <ParlayLegView key={leg.id} leg={leg} index={index} />
            ))}
          </Grid>

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
