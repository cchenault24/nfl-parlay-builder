import { AccessTime as AccessTimeIcon } from '@mui/icons-material'
import { Alert, Box, Chip, Typography } from '@mui/material'
import React from 'react'

export type ErrorBannerType =
  | 'rate_limit_reached'
  | 'rate_limit_warning'
  | 'error'
  | 'info'
  | 'success'

interface ErrorBannerProps {
  type: ErrorBannerType
  title?: string
  message: string
  countdown?: string
  icon?: React.ReactNode
  show?: boolean
}

/**
 * Generic Error Banner Component
 * Shows various types of error and status messages with appropriate styling
 */
export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  type,
  title,
  message,
  countdown,
  icon,
  show = true,
}) => {
  if (!show) {
    return null
  }

  const getSeverity = () => {
    switch (type) {
      case 'rate_limit_reached':
        return 'warning'
      case 'rate_limit_warning':
        return 'info'
      case 'error':
        return 'error'
      case 'info':
        return 'info'
      case 'success':
        return 'success'
      default:
        return 'info'
    }
  }

  const getDefaultIcon = () => {
    switch (type) {
      case 'rate_limit_reached':
      case 'rate_limit_warning':
        return <AccessTimeIcon />
      default:
        return undefined
    }
  }

  const severity = getSeverity()
  const displayIcon = icon || getDefaultIcon()

  return (
    <Alert
      severity={severity}
      icon={displayIcon}
      sx={{
        mb: 2,
        '& .MuiAlert-message': {
          width: '100%',
        },
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        {title && (
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
            {title}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
        {countdown && (
          <Box sx={{ mt: 1 }}>
            <Chip
              label={countdown}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
        )}
      </Box>
    </Alert>
  )
}

export default ErrorBanner
