import {
  Box,
  Card,
  CardContent,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { keyframes } from '@mui/system'
import React, { useEffect, useRef } from 'react'
import { useDynamicLoading } from '../../hooks/useDynamicLoading'
import { DynamicParlayLoadingProps } from '../../types/loading'

// Simple animation keyframes
const pulse = keyframes`
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
`

const DynamicParlayLoading: React.FC<DynamicParlayLoadingProps> = ({
  isMockMode,
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const loadingRef = useRef<HTMLDivElement>(null)

  const {
    currentPhase: activePhase,
    estimatedTimeRemaining,
    currentPhaseData,
    phases,
    isOvertime,
    overtimeSeconds,
  } = useDynamicLoading({
    isMockMode,
    isActive: true,
  })

  // Scroll to center the loading component on mobile when it mounts
  useEffect(() => {
    if (isMobile && loadingRef.current) {
      const element = loadingRef.current
      const elementRect = element.getBoundingClientRect()

      // Calculate the scroll position to position the element at the top with padding
      const padding = 20 // 20px padding from top
      const scrollTop = window.pageYOffset + elementRect.top - padding

      // Smooth scroll to position the element at the top with padding
      window.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth',
      })
    }
  }, [isMobile])

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000)
    if (seconds < 60) {
      return `${seconds}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <Card
      ref={loadingRef}
      variant="outlined"
      sx={{
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: theme.palette.secondary.main,
        },
      }}
    >
      <CardContent sx={{ p: 0 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', py: 2, px: 3 }}>
          <Typography
            variant="h5"
            component="h2"
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 1,
            }}
          >
            {isMockMode ? 'Generating Mock Parlay' : 'Generating Your Parlay'}
          </Typography>
        </Box>

        {/* Main Content - Side by Side Layout */}
        <Box
          sx={{
            display: 'flex',
            minHeight: 200,
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          {/* Left Side - Current Phase */}
          {currentPhaseData &&
            (() => {
              const progressColor = theme.palette.primary.main
              return (
                <Box
                  sx={{
                    flex: 1,
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    borderBottom: {
                      xs: `1px solid ${theme.palette.divider}`,
                      md: 'none',
                    },
                    borderRight: {
                      xs: 'none',
                      md: `1px solid ${theme.palette.divider}`,
                    },
                  }}
                >
                  {/* Large Phase Icon */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      backgroundColor: progressColor,
                      color: 'white',
                      animation: `${pulse} 2s ease-in-out infinite`,
                      mb: 1.5,
                      boxShadow: `0 4px 16px ${progressColor}40`,
                    }}
                  >
                    {currentPhaseData.icon}
                  </Box>

                  {/* Phase Title */}
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: theme.palette.text.primary,
                      mb: 0.5,
                      fontSize: '1.1rem',
                    }}
                  >
                    {currentPhaseData.title}
                  </Typography>

                  {/* Phase Description */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.secondary,
                      maxWidth: 250,
                      lineHeight: 1.4,
                      fontSize: '0.85rem',
                    }}
                  >
                    {currentPhaseData.description}
                  </Typography>
                </Box>
              )
            })()}

          {/* Right Side - Progress Checklist */}
          <Box
            sx={{
              flex: 1,
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                color: theme.palette.text.primary,
                fontWeight: 600,
                mb: 1.5,
                textAlign: 'center',
                fontSize: '0.9rem',
              }}
            >
              Progress
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {phases.map((phase, index) => {
                const isActive = phase.id === activePhase
                const activePhaseIndex = phases.findIndex(
                  p => p.id === activePhase
                )
                const isCompleted = activePhaseIndex > index
                const isUpcoming = activePhaseIndex < index
                const progressColor = theme.palette.primary.main

                return (
                  <Box
                    key={phase.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: 'transparent',
                      transition: 'all 0.3s ease-in-out',
                      ...(isActive && {
                        animation: 'colorPulse 2s ease-in-out infinite',
                        '@keyframes colorPulse': {
                          '0%': {
                            backgroundColor: `${progressColor}20`,
                          },
                          '50%': {
                            backgroundColor: `${progressColor}40`,
                          },
                          '100%': {
                            backgroundColor: `${progressColor}20`,
                          },
                        },
                      }),
                    }}
                  >
                    {/* Status Icon */}
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isCompleted
                          ? theme.palette.success.main
                          : isActive
                            ? progressColor
                            : theme.palette.grey[400],
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        flexShrink: 0,
                      }}
                    >
                      {isCompleted ? '✓' : isActive ? '●' : '○'}
                    </Box>

                    {/* Phase Title */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: isActive
                          ? theme.palette.text.primary
                          : isCompleted
                            ? theme.palette.success.main
                            : theme.palette.text.secondary,
                        fontWeight: isActive ? 600 : 400,
                        opacity: isUpcoming ? 0.6 : 1,
                        fontSize: '0.85rem',
                      }}
                    >
                      {phase.title}
                    </Typography>
                  </Box>
                )
              })}
            </Box>
          </Box>
        </Box>

        {/* Bottom Section - Time Display */}
        <Box
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`,
            p: 2,
            textAlign: 'center',
          }}
        >
          {isOvertime ? (
            <>
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.warning.main,
                  mb: 0.5,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                Taking Extra Time
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: theme.palette.warning.main,
                  fontSize: '1.8rem',
                }}
              >
                {overtimeSeconds > 0 && `+${overtimeSeconds}s`}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.secondary,
                  mt: 0.5,
                  fontStyle: 'italic',
                  fontSize: '0.75rem',
                }}
              >
                We are taking extra time to confirm our analysis
              </Typography>
            </>
          ) : (
            <>
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.primary,
                  mb: 0.5,
                  opacity: 0.8,
                  fontSize: '0.85rem',
                }}
              >
                Estimated Time Remaining
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  fontSize: '1.8rem',
                }}
              >
                {formatTime(estimatedTimeRemaining)}
              </Typography>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

export default DynamicParlayLoading
