import {
  Analytics as AnalyticsIcon,
  CheckCircle as CheckCircleIcon,
  SportsFootball as FootballIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import React from 'react'
import type { GameSummary } from '../../types'

interface GameSummaryViewProps {
  gameSummary: GameSummary
  gameContext: string // e.g., "Chiefs @ Bills - Week 14"
}

const GameSummaryView: React.FC<GameSummaryViewProps> = ({
  gameSummary,
  gameContext,
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'))

  // Removed unused helper functions - v2 API provides clean data

  // Use win probability to determine game flow
  const getGameFlowDisplay = (winProbability: number) => {
    if (winProbability > 0.7) {
      return {
        label: 'Potential Blowout',
        color: 'secondary' as const,
        icon: <TrendingUpIcon fontSize="small" />,
      }
    } else if (winProbability < 0.3) {
      return {
        label: 'Upset Alert',
        color: 'error' as const,
        icon: <FootballIcon fontSize="small" />,
      }
    } else {
      return {
        label: 'Close Game',
        color: 'info' as const,
        icon: <AnalyticsIcon fontSize="small" />,
      }
    }
  }

  const gameFlowDisplay = getGameFlowDisplay(
    gameSummary.gamePrediction.winProbability
  )

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 8) {
      return 'success'
    }
    if (confidence >= 6) {
      return 'info'
    }
    if (confidence >= 4) {
      return 'warning'
    }
    return 'error'
  }

  // Process the data safely
  const matchupText = gameSummary.matchupSummary
  const predictionText = `${gameSummary.gamePrediction.winner} wins ${gameSummary.gamePrediction.projectedScore.home}-${gameSummary.gamePrediction.projectedScore.away} (${Math.round(gameSummary.gamePrediction.winProbability * 100)}% confidence)`
  const keyFactorsList = gameSummary.keyFactors

  return (
    <Card
      elevation={2}
      sx={{
        mb: 3,
        border: '1px solid rgba(76, 175, 80, 0.2)',
        '&:hover': {
          borderColor: 'primary.main',
          transition: 'border-color 0.2s',
        },
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: isMobile ? 1 : 0,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mb: isMobile ? 1 : 0,
              }}
            >
              <AnalyticsIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography
                variant="h6"
                component="h3"
                sx={{ fontSize: isSmall ? '1.1rem' : '1.25rem' }}
              >
                AI Game Analysis
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: 1,
              }}
            >
              <Chip
                icon={gameFlowDisplay.icon}
                label={gameFlowDisplay.label}
                color={gameFlowDisplay.color}
                variant="outlined"
                size="small"
                sx={{
                  fontSize: isSmall ? '0.7rem' : '0.75rem',
                  height: isSmall ? 28 : 32,
                }}
              />
              <Chip
                label={`${Math.round(gameSummary.gamePrediction.winProbability * 100)}% Confidence`}
                color={getConfidenceColor(
                  gameSummary.gamePrediction.winProbability * 10
                )}
                variant="filled"
                size="small"
                sx={{
                  fontSize: isSmall ? '0.7rem' : '0.75rem',
                  height: isSmall ? 28 : 32,
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Game Context */}
        <Typography
          variant="subtitle2"
          color="text.secondary"
          gutterBottom
          sx={{
            fontSize: isSmall ? '0.8rem' : '0.875rem',
            mb: 2,
          }}
        >
          {gameContext}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Matchup Analysis */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{
              fontWeight: 600,
              fontSize: isSmall ? '1rem' : '1.1rem',
            }}
          >
            Matchup Analysis
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            paragraph
            sx={{
              fontSize: isSmall ? '0.85rem' : '0.875rem',
              lineHeight: isSmall ? 1.4 : 1.5,
            }}
          >
            {matchupText}
          </Typography>
        </Box>

        {/* Key Factors */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{
              fontWeight: 600,
              fontSize: isSmall ? '1rem' : '1.1rem',
            }}
          >
            Key Factors
          </Typography>
          <List dense sx={{ pt: 0 }}>
            {keyFactorsList.map(factor => (
              <ListItem key={`keyFactor-${factor}`} sx={{ py: 0.5, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon
                    fontSize="small"
                    color="primary"
                    sx={{ opacity: 0.7 }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={factor}
                  primaryTypographyProps={{
                    variant: 'body2',
                    color: 'text.secondary',
                    fontSize: isSmall ? '0.85rem' : '0.875rem',
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Game Prediction */}
        <Box>
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{
              fontWeight: 600,
              fontSize: isSmall ? '1rem' : '1.1rem',
            }}
          >
            Game Prediction
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontStyle: 'italic',
              pl: 2,
              borderLeft: '3px solid',
              borderLeftColor: 'primary.main',
              py: 1,
              fontSize: isSmall ? '0.85rem' : '0.875rem',
              lineHeight: isSmall ? 1.4 : 1.5,
            }}
          >
            {predictionText}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default GameSummaryView
