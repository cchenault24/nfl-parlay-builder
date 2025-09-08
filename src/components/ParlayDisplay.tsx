import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Grid,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Sports as SportsIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import type { GeneratedParlay, BetType } from '../types/parlay';

interface ParlayDisplayProps {
  parlay: GeneratedParlay | null;
  loading: boolean;
}

const ParlayDisplay: React.FC<ParlayDisplayProps> = ({ parlay, loading }) => {
  const getBetTypeIcon = (betType: BetType) => {
    switch (betType) {
      case 'player_prop':
        return <PersonIcon />;
      case 'spread':
      case 'total':
      case 'moneyline':
      default:
        return <SportsIcon />;
    }
  };

  const getBetTypeColor = (betType: BetType) => {
    switch (betType) {
      case 'spread':
        return 'primary';
      case 'total':
        return 'secondary';
      case 'moneyline':
        return 'success';
      case 'player_prop':
        return 'info';
      default:
        return 'default';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 8) return 'success';
    if (confidence >= 6) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            AI is analyzing stats and generating your parlay...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This may take 10-15 seconds
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!parlay) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            Select a game and click "Create 3-Leg Parlay" to get started
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <TrendingUpIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            AI Generated Parlay
          </Typography>
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
            <Grid item xs={12} key={leg.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getBetTypeIcon(leg.betType)}
                    <Typography variant="h6" sx={{ ml: 1, flex: 1 }}>
                      Leg {index + 1}
                    </Typography>
                    <Chip
                      label={leg.betType.replace('_', ' ').toUpperCase()}
                      color={getBetTypeColor(leg.betType) as any}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body1" fontWeight="bold" sx={{ mb: 1 }}>
                    {leg.target}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {leg.reasoning}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ mr: 1 }}>
                      AI Confidence:
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={leg.confidence * 10}
                      color={getConfidenceColor(leg.confidence) as any}
                      sx={{ flex: 1, mr: 1 }}
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

        <Divider sx={{ my: 2 }} />

        <Box>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
            AI Analysis:
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {parlay.aiReasoning}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Overall Confidence: {parlay.overallConfidence}/10
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              ✨ Generated by AI • {new Date(parlay.createdAt).toLocaleTimeString()}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ParlayDisplay;