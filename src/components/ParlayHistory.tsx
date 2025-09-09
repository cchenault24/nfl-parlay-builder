import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Grid,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Casino as CasinoIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getUserParlays } from '../config/firebase';
import { GeneratedParlay } from '../types';

interface ParlayHistoryProps {
  open: boolean;
  onClose: () => void;
}

export const ParlayHistory: React.FC<ParlayHistoryProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const [parlays, setParlays] = useState<GeneratedParlay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && user) {
      fetchParlays();
    }
  }, [open, user]);

  const fetchParlays = async () => {
    if (!user) return;

    setLoading(true);
    setError('');
    try {
      const userParlays = await getUserParlays(user.uid);
      setParlays(userParlays as GeneratedParlay[]);
    } catch (error) {
      setError('Failed to load parlay history');
      console.error('Error fetching parlays:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    
    // Handle Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getBetTypeColor = (betType: string) => {
    switch (betType) {
      case 'spread': return 'primary';
      case 'total': return 'secondary';
      case 'moneyline': return 'success';
      case 'player_prop': return 'info';
      default: return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            <CasinoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No parlays yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generate your first AI parlay to see it here!
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {parlays.map((parlay) => (
              <Card key={parlay.id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {parlay.gameContext}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={parlay.estimatedOdds}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(parlay.savedAt || parlay.createdAt)}
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    {parlay.legs.map((leg, index) => (
                      <Grid item xs={12} sm={4} key={leg.id}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="caption" fontWeight="medium">
                                Leg {index + 1}
                              </Typography>
                              <Chip
                                label={leg.betType.replace('_', ' ').toUpperCase()}
                                color={getBetTypeColor(leg.betType) as any}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1, lineHeight: 1.2 }}>
                              {leg.target}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                              {leg.reasoning.length > 60 ? `${leg.reasoning.substring(0, 60)}...` : leg.reasoning}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Chip
                                label={leg.odds}
                                variant="outlined"
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                              <Typography variant="caption" fontWeight="bold">
                                {leg.confidence}/10
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>

                  <Divider sx={{ my: 1 }} />

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>AI Analysis:</strong> {parlay.aiReasoning}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Overall Confidence: {parlay.overallConfidence}/10
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ✨ Generated by AI
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};