import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Typography,
  useTheme,
} from '@mui/material'
import { keyframes } from '@mui/system'
import React from 'react'
import { useDynamicLoading } from '../../hooks/useDynamicLoading'
import { DynamicParlayLoadingProps } from '../../types/loading'

// Animation keyframes
const pulse = keyframes`
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
`

const slideIn = keyframes`
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const DynamicParlayLoading: React.FC<DynamicParlayLoadingProps> = ({
  isMockMode,
}) => {
  const theme = useTheme()
  const {
    currentPhase: activePhase,
    phaseProgress,
    overallProgress,
    estimatedTimeRemaining,
    currentPhaseData,
    phases,
    isOvertime,
    overtimeSeconds,
  } = useDynamicLoading({
    isMockMode,
    isActive: true,
  })

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000)
    if (seconds < 60) {
      return `${seconds}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getProgressColor = (progress: number): string => {
    if (progress < 30) return theme.palette.primary.main
    if (progress < 70) return theme.palette.warning.main
    return theme.palette.success.main
  }

  return (
    <Card
      sx={{
        width: '100%',
        animation: `${fadeIn} 0.3s ease-in-out`,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        boxShadow: theme.shadows[4],
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <CardContent sx={{ textAlign: 'center', py: 4 }}>
        {/* Header */}
        <Typography
          variant="h4"
          component="h2"
          gutterBottom
          sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
            mb: 4,
          }}
        >
          {isMockMode ? 'Generating Mock Parlay' : 'Generating Your Parlay'}
        </Typography>

        {/* Current Phase Display */}
        {currentPhaseData && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 4,
              animation: `${slideIn} 0.5s ease-out`,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                p: 3,
                borderRadius: 2,
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                maxWidth: 600,
                mx: 'auto',
                boxShadow: theme.shadows[2],
              }}
            >
              {/* Phase Icon */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  backgroundColor: getProgressColor(phaseProgress),
                  color: 'white',
                  animation: `${pulse} 2s ease-in-out infinite`,
                  boxShadow: theme.shadows[2],
                }}
              >
                {currentPhaseData.icon}
              </Box>

              {/* Phase Info */}
              <Box sx={{ textAlign: 'left', flex: 1 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    mb: 1,
                  }}
                >
                  {currentPhaseData.title}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: theme.palette.text.primary,
                    fontSize: '1rem',
                    opacity: 0.8,
                  }}
                >
                  {currentPhaseData.description}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Overall Progress Bar */}
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ color: theme.palette.text.primary, fontWeight: 600 }}
            >
              Overall Progress
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: theme.palette.text.primary, fontWeight: 600 }}
            >
              {Math.round(overallProgress)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={overallProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: getProgressColor(overallProgress),
                transition: 'all 0.3s ease-in-out',
              },
            }}
          />
        </Box>

        {/* Phase Progress */}
        {currentPhaseData && (
          <Box sx={{ mb: 4 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
              }}
            >
              <Typography
                variant="body1"
                sx={{ color: theme.palette.text.primary, fontWeight: 500 }}
              >
                {currentPhaseData.title}
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: theme.palette.text.primary, fontWeight: 500 }}
              >
                {Math.round(phaseProgress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={phaseProgress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: theme.palette.grey[100],
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  backgroundColor: theme.palette.primary.main,
                  transition: 'all 0.2s ease-in-out',
                },
              }}
            />
          </Box>
        )}

        {/* Phase Indicators */}
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 1.5,
              flexWrap: 'wrap',
            }}
          >
            {phases.map((phase, index) => {
              const isActive = phase.id === activePhase
              const isCompleted =
                phases.findIndex(p => p.id === activePhase) > index
              const isUpcoming =
                phases.findIndex(p => p.id === activePhase) < index

              return (
                <Chip
                  key={phase.id}
                  label={phase.title}
                  size="medium"
                  variant={isActive ? 'filled' : 'outlined'}
                  sx={{
                    fontSize: '0.9rem',
                    height: 40,
                    fontWeight: 600,
                    transition: 'all 0.3s ease-in-out',
                    opacity: isUpcoming ? 0.6 : 1,
                    animation: isActive
                      ? `${pulse} 2s ease-in-out infinite`
                      : 'none',
                    backgroundColor: isActive
                      ? theme.palette.primary.main
                      : isCompleted
                        ? theme.palette.success.main
                        : theme.palette.background.paper,
                    color:
                      isActive || isCompleted
                        ? 'white'
                        : theme.palette.text.primary,
                    borderColor: isActive
                      ? theme.palette.primary.main
                      : theme.palette.grey[300],
                    '&:hover': {
                      backgroundColor: isActive
                        ? theme.palette.primary.main
                        : theme.palette.grey[200],
                    },
                  }}
                />
              )
            })}
          </Box>
        </Box>

        {/* Time Display */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mb: 4,
            p: 3,
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[1],
            maxWidth: 500,
            mx: 'auto',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            {isOvertime ? (
              <>
                <Typography
                  variant="body1"
                  sx={{
                    color: theme.palette.warning.main,
                    mb: 1,
                    fontWeight: 600,
                  }}
                >
                  Taking Extra Time
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.warning.main,
                  }}
                >
                  +{overtimeSeconds}s
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.secondary,
                    mt: 1,
                    fontStyle: 'italic',
                  }}
                >
                  We are taking extra time to confirm our analysis
                </Typography>
              </>
            ) : (
              <>
                <Typography
                  variant="body1"
                  sx={{
                    color: theme.palette.text.primary,
                    mb: 1,
                    opacity: 0.8,
                  }}
                >
                  Estimated Time Remaining
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 600, color: theme.palette.text.primary }}
                >
                  {formatTime(estimatedTimeRemaining)}
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default DynamicParlayLoading
