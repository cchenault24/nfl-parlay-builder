import {
  CheckCircle as CheckIcon,
  Schedule as ClockIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Chip,
  Fade,
  LinearProgress,
  Tooltip,
  Typography,
} from '@mui/material'
import React, { useEffect, useState } from 'react'
import { RateLimitInfo } from '../../types'

interface RateLimitIndicatorProps {
  rateLimitInfo: RateLimitInfo | null
  isLoading?: boolean
  error?: string | null
}

/**
 * Rate Limit Indicator Component
 * Shows user their current usage and remaining requests
 */
export const RateLimitIndicator: React.FC<RateLimitIndicatorProps> = ({
  rateLimitInfo,
  isLoading = false,
  error = null,
}) => {
  const [timeUntilReset, setTimeUntilReset] = useState<string>('')

  // Update countdown timer
  useEffect(() => {
    if (!rateLimitInfo?.resetTime) {
      return
    }

    const updateTimer = () => {
      const now = new Date()
      const resetTime = new Date(rateLimitInfo.resetTime)
      const timeDiff = resetTime.getTime() - now.getTime()

      if (timeDiff <= 0) {
        setTimeUntilReset('Reset available')
        return
      }

      const minutes = Math.floor(timeDiff / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

      if (minutes > 0) {
        setTimeUntilReset(`${minutes}m ${seconds}s`)
      } else {
        setTimeUntilReset(`${seconds}s`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [rateLimitInfo?.resetTime])

  if (error) {
    return (
      <Fade in>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Unable to check rate limit status. You may experience limitations.
          </Typography>
        </Alert>
      </Fade>
    )
  }

  if (isLoading || !rateLimitInfo) {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" gutterBottom>
          Checking usage limits...
        </Typography>
        {/* Fix 1: Remove invalid 'size' prop from LinearProgress */}
        <LinearProgress />
      </Box>
    )
  }

  // Fix 2: Remove unused currentCount destructuring
  const { remaining, total } = rateLimitInfo
  const usagePercentage = ((total - remaining) / total) * 100
  const isNearLimit = remaining <= 2
  const isAtLimit = remaining === 0

  const getStatusColor = () => {
    if (isAtLimit) {
      return 'error'
    }
    if (isNearLimit) {
      return 'warning'
    }
    return 'success'
  }

  const getStatusIcon = () => {
    if (isAtLimit) {
      return <WarningIcon fontSize="small" />
    }
    if (isNearLimit) {
      return <WarningIcon fontSize="small" />
    }
    return <CheckIcon fontSize="small" />
  }

  // Fix 3: Remove unused getStatusText function or use it
  // Since it's not used anywhere, I'll remove it

  return (
    <Fade in>
      <Box sx={{ mb: 2 }}>
        {/* Status Chip */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip
            icon={getStatusIcon()}
            label={`${remaining}/${total} requests remaining`}
            color={getStatusColor()}
            size="small"
            variant={isAtLimit ? 'filled' : 'outlined'}
          />

          {timeUntilReset && (
            <Tooltip title="Time until rate limit resets">
              <Chip
                icon={<ClockIcon fontSize="small" />}
                label={timeUntilReset}
                size="small"
                variant="outlined"
                color="default"
              />
            </Tooltip>
          )}
        </Box>

        {/* Usage Bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ minWidth: 60 }}
          >
            Usage:
          </Typography>
          <Box sx={{ flexGrow: 1 }}>
            <LinearProgress
              variant="determinate"
              value={usagePercentage}
              color={getStatusColor()}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }}
            />
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ minWidth: 40 }}
          >
            {Math.round(usagePercentage)}%
          </Typography>
        </Box>

        {/* Warning Messages */}
        {isAtLimit && (
          <Alert severity="error" sx={{ mt: 1 }}>
            <Typography variant="body2">
              You&apos;ve reached your hourly limit of {total} parlay
              generations. Please wait {timeUntilReset} before generating more
              parlays.
            </Typography>
          </Alert>
        )}

        {isNearLimit && !isAtLimit && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            <Typography variant="body2">
              You have {remaining} parlay generations remaining this hour. Limit
              resets in {timeUntilReset}.
            </Typography>
          </Alert>
        )}
      </Box>
    </Fade>
  )
}

export default RateLimitIndicator
