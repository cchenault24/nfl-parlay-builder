import React, { useState } from 'react'
import {
  Box,
  Menu,
  MenuItem,
  Typography,
  ListItemIcon,
  ListItemText,
  Paper,
  Fade,
  useTheme,
  Chip,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  CalendarToday as CalendarIcon,
  Check as CheckIcon,
  SportsFootball as FootballIcon,
  Lock as LockIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material'
import { useCurrentWeek } from '../hooks/useCurrentWeek'

interface WeekSelectorProps {
  currentWeek: number
  onWeekChange: (week: number) => void
  availableWeeks?: number[]
  loading?: boolean
}

const WeekSelector: React.FC<WeekSelectorProps> = ({
  currentWeek,
  onWeekChange,
  availableWeeks = Array.from({ length: 18 }, (_, i) => i + 1),
  loading = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const theme = useTheme()

  // Get the actual current NFL week to determine what's in the past
  const { currentWeek: actualCurrentWeek } = useCurrentWeek()

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!loading) {
      setAnchorEl(event.currentTarget)
    }
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleWeekSelect = (week: number) => {
    // Only allow selection if week is not in the past
    if (!isWeekPassed(week)) {
      onWeekChange(week)
      handleClose()
    }
  }

  const getWeekLabel = (week: number) => {
    return `Week ${week}`
  }

  const getWeekDescription = (week: number) => {
    if (week >= 1 && week <= 18) {
      return 'Regular Season'
    } else if (week === 19) {
      return 'Wild Card'
    } else if (week === 20) {
      return 'Divisional'
    } else if (week === 21) {
      return 'Conference Championship'
    } else if (week === 22) {
      return 'Super Bowl'
    }
    return 'Season'
  }

  const isWeekPassed = (week: number): boolean => {
    return week < (actualCurrentWeek || 1)
  }

  const isWeekCurrent = (week: number): boolean => {
    return week === (actualCurrentWeek || 1)
  }

  const getWeekStatus = (week: number): 'past' | 'current' | 'future' => {
    if (isWeekPassed(week)) {
      return 'past'
    }
    if (isWeekCurrent(week)) {
      return 'current'
    }
    return 'future'
  }

  const getWeekIcon = (week: number) => {
    const status = getWeekStatus(week)
    const isSelected = week === currentWeek

    if (isSelected) {
      return (
        <CheckIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
      )
    }

    switch (status) {
      case 'past':
        return (
          <CheckCircleIcon
            sx={{ fontSize: 16, color: 'text.disabled', opacity: 0.5 }}
          />
        )
      case 'current':
        return (
          <ScheduleIcon
            sx={{ fontSize: 16, color: theme.palette.warning.main }}
          />
        )
      case 'future':
        return (
          <FootballIcon
            sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.6 }}
          />
        )
      default:
        return (
          <FootballIcon
            sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.6 }}
          />
        )
    }
  }

  const getWeekStatusChip = (week: number) => {
    const status = getWeekStatus(week)

    switch (status) {
      case 'past':
        return (
          <Chip
            label="Completed"
            size="small"
            sx={{
              height: 18,
              fontSize: '0.65rem',
              fontWeight: 600,
              backgroundColor: 'rgba(158, 158, 158, 0.2)',
              color: 'rgba(158, 158, 158, 0.8)',
              border: '1px solid rgba(158, 158, 158, 0.3)',
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
        )
      case 'current':
        return (
          <Chip
            label="Live"
            size="small"
            sx={{
              height: 18,
              fontSize: '0.65rem',
              fontWeight: 600,
              backgroundColor: 'rgba(255, 152, 0, 0.25)',
              color: '#ff9800',
              border: '1px solid #ff9800',
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
        )
      case 'future':
        return (
          <Chip
            label="Upcoming"
            size="small"
            sx={{
              height: 18,
              fontSize: '0.65rem',
              fontWeight: 600,
              backgroundColor: 'rgba(46, 125, 50, 0.25)',
              color: '#2e7d32',
              border: '1px solid #2e7d32',
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
        )
      default:
        return null
    }
  }

  const getCurrentWeekStatusChip = () => {
    return getWeekStatusChip(currentWeek)
  }

  return (
    <>
      <Paper
        elevation={0}
        onClick={handleClick}
        sx={{
          position: 'relative',
          cursor: loading ? 'default' : 'pointer',
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          borderRadius: 3,
          overflow: 'hidden',
          minWidth: 180,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 4px 20px rgba(46, 125, 50, 0.3)',
          border: `2px solid ${theme.palette.primary.light}`,
          '&:hover': {
            transform: loading ? 'none' : 'translateY(-2px) scale(1.02)',
            boxShadow: '0 8px 30px rgba(46, 125, 50, 0.4)',
            '& .expand-icon': {
              transform: 'rotate(180deg)',
            },
          },
          '&:active': {
            transform: loading ? 'none' : 'translateY(0px) scale(0.98)',
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
            opacity: 0,
            transition: 'opacity 0.3s ease',
          },
          '&:hover::before': {
            opacity: 1,
          },
        }}
      >
        {/* Top row with NFL badge and status chip */}
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            left: 6,
            right: 6,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* NFL Badge */}
          <Box
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              borderRadius: 1,
              px: 1,
              py: 0.25,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: 'white',
                letterSpacing: '0.5px',
              }}
            >
              NFL
            </Typography>
          </Box>

          {/* Week Status Badge */}
          {getCurrentWeekStatusChip()}
        </Box>

        {/* Main Content */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            px: 2,
            pt: 2.5, // Add top padding to account for top row
            pb: 1,
          }}
        >
          <FootballIcon
            sx={{
              fontSize: 24,
              color: 'white',
              mr: 1.5,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }}
          />

          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '1.1rem',
                color: 'white',
                lineHeight: 1.2,
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                mb: 0.25,
              }}
            >
              {getWeekLabel(currentWeek)}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: 500,
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}
            >
              {getWeekDescription(currentWeek)}
            </Typography>
          </Box>

          <ExpandMoreIcon
            className="expand-icon"
            sx={{
              fontSize: 24,
              color: 'white',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
            }}
          />
        </Box>

        {/* Loading overlay */}
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: 'white', fontWeight: 600 }}
            >
              Loading...
            </Typography>
          </Box>
        )}
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        TransitionComponent={Fade}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            maxHeight: 420,
            width: 280,
            mt: 1,
            backgroundColor: '#1a1a1a',
            backgroundImage:
              'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            border: '1px solid rgba(46, 125, 50, 0.3)',
            borderRadius: 2,
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7)',
            overflow: 'hidden',
          },
        }}
        MenuListProps={{
          sx: { py: 0 },
        }}
      >
        {/* Menu Header */}
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: '1px solid rgba(46, 125, 50, 0.2)',
            background:
              'linear-gradient(90deg, rgba(46, 125, 50, 0.1) 0%, rgba(46, 125, 50, 0.05) 100%)',
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              color: theme.palette.primary.main,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <CalendarIcon sx={{ fontSize: 18 }} />
            Select NFL Week
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              opacity: 0.8,
            }}
          >
            2024-25 Season • Week {actualCurrentWeek} is current
          </Typography>
        </Box>

        {/* Week Options */}
        <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
          {availableWeeks.map(week => {
            const isPast = isWeekPassed(week)
            const isSelected = week === currentWeek

            return (
              <MenuItem
                key={week}
                onClick={() => handleWeekSelect(week)}
                selected={isSelected}
                disabled={isPast}
                sx={{
                  minHeight: 60,
                  px: 3,
                  py: 1.5,
                  position: 'relative',
                  opacity: isPast ? 0.5 : 1,
                  cursor: isPast ? 'not-allowed' : 'pointer',
                  '&:hover': {
                    backgroundColor: isPast
                      ? 'transparent'
                      : 'rgba(46, 125, 50, 0.1)',
                    '&::before': {
                      opacity: isPast ? 0 : 1,
                    },
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(46, 125, 50, 0.2)',
                    '&:hover': {
                      backgroundColor: 'rgba(46, 125, 50, 0.25)',
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      backgroundColor: theme.palette.primary.main,
                    },
                  },
                  '&.Mui-disabled': {
                    opacity: 0.4,
                    '& .MuiListItemIcon-root': {
                      opacity: 0.5,
                    },
                    '& .MuiListItemText-root': {
                      opacity: 0.5,
                    },
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    background:
                      'linear-gradient(90deg, rgba(46, 125, 50, 0.05) 0%, transparent 100%)',
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {isPast ? (
                    <LockIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  ) : (
                    getWeekIcon(week)
                  )}
                </ListItemIcon>
                <ListItemText sx={{ pr: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: isSelected ? 700 : 500,
                          color: isPast
                            ? 'text.disabled'
                            : isSelected
                              ? theme.palette.primary.main
                              : 'text.primary',
                          textDecoration: isPast ? 'line-through' : 'none',
                        }}
                      >
                        {getWeekLabel(week)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: isPast ? 'text.disabled' : 'text.secondary',
                          fontSize: '0.7rem',
                        }}
                      >
                        {getWeekDescription(week)}
                      </Typography>
                    </Box>
                    <Box sx={{ ml: 1 }}>{getWeekStatusChip(week)}</Box>
                  </Box>
                </ListItemText>
              </MenuItem>
            )
          })}
        </Box>

        {/* Footer with info */}
        <Box
          sx={{
            px: 3,
            py: 1.5,
            borderTop: '1px solid rgba(46, 125, 50, 0.2)',
            background: 'rgba(46, 125, 50, 0.05)',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.65rem',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <LockIcon sx={{ fontSize: 12 }} />
            Past weeks are unavailable for betting
          </Typography>
        </Box>
      </Menu>
    </>
  )
}

export default WeekSelector
