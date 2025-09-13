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

  // Helper function to safely render matchup analysis
  const renderMatchupAnalysis = (analysis: string | any): string => {
    if (typeof analysis === 'string') {
      return analysis
    }

    // If it's an object, try to extract meaningful text
    if (typeof analysis === 'object' && analysis !== null) {
      // Try to combine object values into readable text
      const values = Object.values(analysis)
      if (values.length > 0 && values.every(val => typeof val === 'string')) {
        return values.join(' ')
      }

      // Fallback: convert object to readable format
      const keys = Object.keys(analysis)
      if (keys.length > 0) {
        return keys
          .map(key => {
            const value = analysis[key]
            return typeof value === 'string'
              ? value
              : `${key}: ${String(value)}`
          })
          .join('. ')
      }
    }

    // Final fallback
    return 'Matchup analysis data is not in the expected format.'
  }

  // Helper function to safely render prediction
  const renderPrediction = (prediction: string | any): string => {
    if (typeof prediction === 'string') {
      return prediction
    }

    if (typeof prediction === 'object' && prediction !== null) {
      const values = Object.values(prediction)
      if (values.length > 0 && values.every(val => typeof val === 'string')) {
        return values.join(' ')
      }
    }

    return 'Game prediction is not in the expected format.'
  }

  // Helper function to safely render key factors
  const renderKeyFactors = (factors: string[] | any): string[] => {
    if (Array.isArray(factors) && factors.every(f => typeof f === 'string')) {
      return factors
    }

    if (typeof factors === 'object' && factors !== null) {
      const values = Object.values(factors)
      if (values.length > 0) {
        return values.map(val => String(val)).slice(0, 5)
      }
    }

    return ['Key factors data is not in the expected format']
  }

  // Map gameFlow to display properties
  const getGameFlowDisplay = (gameFlow: GameSummary['gameFlow']) => {
    const flowMap = {
      high_scoring_shootout: {
        label: 'High-Scoring Shootout',
        color: 'error' as const,
        icon: <TrendingUpIcon fontSize="small" />,
      },
      defensive_grind: {
        label: 'Defensive Grind',
        color: 'warning' as const,
        icon: <FootballIcon fontSize="small" />,
      },
      balanced_tempo: {
        label: 'Balanced Tempo',
        color: 'info' as const,
        icon: <AnalyticsIcon fontSize="small" />,
      },
      potential_blowout: {
        label: 'Potential Blowout',
        color: 'secondary' as const,
        icon: <TrendingUpIcon fontSize="small" />,
      },
    }
    return flowMap[gameFlow]
  }

  const gameFlowDisplay = getGameFlowDisplay(gameSummary.gameFlow)

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 8) return 'success'
    if (confidence >= 6) return 'info'
    if (confidence >= 4) return 'warning'
    return 'error'
  }

  // Process the data safely
  const matchupText = renderMatchupAnalysis(gameSummary.matchupAnalysis)
  const predictionText = renderPrediction(gameSummary.prediction)
  const keyFactorsList = renderKeyFactors(gameSummary.keyFactors)

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
          {/* Title Row */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <AnalyticsIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography
              variant="h6"
              component="h3"
              sx={{
                flexGrow: 1,
                fontSize: isSmall ? '1.1rem' : '1.25rem',
              }}
            >
              AI Game Analysis
            </Typography>
          </Box>

          {/* Chips Row - Use breakpoint-based logic */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: isMobile ? 'flex-start' : 'flex-end',
              gap: isMobile ? theme.spacing(1) : theme.spacing(1),
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
                width: 'fit-content',
              }}
            />
            <Chip
              label={`${gameSummary.confidence}/10 Confidence`}
              color={getConfidenceColor(gameSummary.confidence)}
              variant="filled"
              size="small"
              sx={{
                fontSize: isSmall ? '0.7rem' : '0.75rem',
                height: isSmall ? 28 : 32,
                width: 'fit-content',
              }}
            />
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
            {keyFactorsList.map((factor, index) => (
              <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
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
