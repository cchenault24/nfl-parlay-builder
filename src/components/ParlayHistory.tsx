import {
  Casino as CasinoIcon,
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material'
import {
  Alert,
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
  Grid,
  IconButton,
  Typography,
} from '@mui/material'
import { Timestamp } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import { getUserParlays } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { GeneratedParlay } from '../types'

interface ParlayHistoryProps {
  open: boolean
  onClose: () => void
}

export const ParlayHistory: React.FC<ParlayHistoryProps> = ({
  open,
  onClose,
}) => {
  const { user } = useAuth()
  const [parlays, setParlays] = useState<GeneratedParlay[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !user) {
      return
    }

    setLoading(true)
    setError('')

    // getUserParlays returns an unsubscribe function for the real-time listener
    const unsubscribe = getUserParlays(user.uid, parlayData => {
      setParlays(parlayData as GeneratedParlay[])
      setLoading(false)
    })

    // Clean up the listener when component unmounts or modal closes
    return () => {
      unsubscribe()
    }
  }, [open, user])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setParlays([])
      setLoading(false)
      setError('')
    }
  }, [open])

  const formatDate = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) {
      return 'Unknown date'
    }

    const date = timestamp.toDate()
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getBetTypeColor = (betType: string) => {
    switch (betType) {
      case 'spread':
        return 'primary'
      case 'total':
        return 'secondary'
      case 'moneyline':
        return 'success'
      case 'player_prop':
        return 'info'
      default:
        return 'default'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 8) {
      return 'success'
    }
    if (confidence >= 6) {
      return 'warning'
    }
    return 'error'
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon />
          <Typography variant="h6">Parlay History</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : parlays.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CasinoIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Parlays Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your first parlay to see it here!
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {parlays.map((parlay, index) => (
              <Card key={parlay.id || `parlay-${index}`} sx={{ mb: 2 }}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" gutterBottom>
                      {parlay.gameContext || 'NFL Parlay'}
                    </Typography>
                    <Chip
                      label={parlay.estimatedOdds || 'N/A'}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Saved: {formatDate(parlay.savedAt)}
                  </Typography>

                  <Grid container spacing={2}>
                    {parlay.legs?.map(leg => (
                      <Grid item xs={12} key={`${parlay.id}-leg-${leg.id}`}>
                        <Box
                          sx={{
                            p: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            bgcolor: 'background.paper',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              mb: 1,
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Chip
                                label={leg.betType.replace('_', ' ')}
                                color={getBetTypeColor(leg.betType)}
                                size="small"
                                variant="outlined"
                              />
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 'bold' }}
                              >
                                {leg.odds}
                              </Typography>
                            </Box>
                            <Chip
                              label={`${leg.confidence}/10`}
                              color={getConfidenceColor(leg.confidence)}
                              size="small"
                            />
                          </Box>

                          <Typography
                            variant="body1"
                            sx={{ fontWeight: 'medium', mb: 1 }}
                          >
                            {leg.target}
                          </Typography>

                          {leg.reasoning && (
                            <Typography variant="body2" color="text.secondary">
                              {leg.reasoning}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
