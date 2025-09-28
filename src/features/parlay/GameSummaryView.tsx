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
import { getConfidenceColor } from '../../utils'

type MatchupAnalysisData = string | Record<string, unknown> | null | undefined
type PredictionData = string | Record<string, unknown> | null | undefined
type KeyFactorsData =
  | string[]
  | string
  | Record<string, unknown>
  | null
  | undefined

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
  const renderMatchupAnalysis = (analysis: MatchupAnalysisData): string => {
    let text = ''

    if (typeof analysis === 'string') {
      text = analysis
    } else if (typeof analysis === 'object' && analysis !== null) {
      // Try to combine object values into readable text
      const values = Object.values(analysis)
      if (values.length > 0 && values.every(val => typeof val === 'string')) {
        text = values.join(' ')
      } else {
        // Fallback: convert object to readable format
        const keys = Object.keys(analysis)
        if (keys.length > 0) {
          text = keys
            .map(key => {
              const value = analysis[key]
              return typeof value === 'string'
                ? value
                : `${key}: ${String(value)}`
            })
            .join('. ')
        }
      }
    }

    if (!text) {
      return 'Matchup analysis data is not in the expected format.'
    }

    // Clean the text to remove any special characters
    return (
      text
        .trim()
        // Remove any non-printable characters except spaces, newlines, and tabs
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        // Normalize quotes
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        // Remove any BOM or other Unicode markers
        .replace(/^\uFEFF/, '')
        // Clean up multiple spaces
        .replace(/\s+/g, ' ')
        // Remove any remaining control characters
        .replace(/[\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, ' ')
    )
  }

  // Helper function to safely render prediction
  const renderPrediction = (prediction: PredictionData): string => {
    let text = ''

    if (typeof prediction === 'string') {
      text = prediction
    } else if (typeof prediction === 'object' && prediction !== null) {
      const values = Object.values(prediction)
      if (values.length > 0 && values.every(val => typeof val === 'string')) {
        text = values.join(' ')
      }
    }

    if (!text) {
      return 'Game prediction is not in the expected format.'
    }

    // Clean the text to remove any special characters
    return (
      text
        .trim()
        // Remove any non-printable characters except spaces, newlines, and tabs
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        // Normalize quotes
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        // Remove any BOM or other Unicode markers
        .replace(/^\uFEFF/, '')
        // Clean up multiple spaces
        .replace(/\s+/g, ' ')
        // Remove any remaining control characters
        .replace(/[\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, ' ')
    )
  }

  // Helper function to safely render key factors
  const renderKeyFactors = (factors: KeyFactorsData): string[] => {
    const cleanFactor = (factor: string): string => {
      let cleaned = String(factor).trim()

      // Remove quotes from start and end
      cleaned = cleaned.replace(/^["']|["']$/g, '')

      // Remove common symbols from the start
      cleaned = cleaned.replace(/^(-|•|\*|\+|►|▶️|✓|✅|→|➤|◦|‣|⁃|\$)\s*/, '')

      // Remove numbered list prefixes (1., 2), etc.)
      cleaned = cleaned.replace(/^\d+[.)\]]\s*/, '')

      // Remove bullet point symbols
      cleaned = cleaned.replace(/^[■□▪▫●○◆◇]\s*/, '')

      // Remove $ characters from anywhere in the string
      cleaned = cleaned.replace(/\$/g, '')

      // Trim again after cleaning
      cleaned = cleaned.trim()

      // Ensure first letter is capitalized
      if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
      }

      // Ensure it doesn't end with a period (looks cleaner in lists)
      if (cleaned.endsWith('.')) {
        cleaned = cleaned.slice(0, -1)
      }

      return cleaned
    }

    if (Array.isArray(factors) && factors.every(f => typeof f === 'string')) {
      return factors
        .map(cleanFactor)
        .filter(f => f.length > 0)
        .slice(0, 5)
    }

    if (typeof factors === 'object' && factors !== null) {
      const values = Object.values(factors)
      if (values.length > 0) {
        return values
          .map(val => cleanFactor(String(val)))
          .filter(f => f.length > 0)
          .slice(0, 5)
      }
    }

    if (typeof factors === 'string') {
      // Handle case where it's a single string that might contain multiple factors
      const splitFactors = factors
        .split(/[,;]|\n/)
        .map(cleanFactor)
        .filter(f => f.length > 0)
      if (splitFactors.length > 1) {
        return splitFactors.slice(0, 5)
      }
      return [cleanFactor(factors)]
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

  const gameFlowDisplay = getGameFlowDisplay(gameSummary.gameFlow) || {
    label: 'Unknown Game Flow',
    color: 'default' as const,
    icon: <FootballIcon fontSize="small" />,
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
                label={`${gameSummary.confidence}/10 Confidence`}
                color={getConfidenceColor(gameSummary.confidence)}
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
