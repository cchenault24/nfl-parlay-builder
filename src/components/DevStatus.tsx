import {
  BugReport as BugIcon,
  ExpandMore as ExpandMoreIcon,
  ToggleOn as ToggleIcon,
} from '@mui/icons-material'
import {
  Box,
  Chip,
  Collapse,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import React from 'react'
import { useParlayGeneratorSelector } from '../hooks/useParlayGeneratorSelector'
import { useRateLimit } from '../hooks/useRateLimit'
import useGeneralStore from '../store/generalStore'
import RateLimitIndicator from './RateLimitIndicator'

/**
 * Development Status Component
 * Shows service status, environment info, rate limiting, and mock toggle in development
 */
const DevStatus: React.FC = () => {
  const [expanded, setExpanded] = React.useState(false)
  const { serviceStatus } = useParlayGeneratorSelector()
  const {
    rateLimitInfo,
    isLoading: rateLimitLoading,
    error: rateLimitError,
  } = useRateLimit()

  // Mock toggle state from store
  const devMockOverride = useGeneralStore(state => state.devMockOverride)
  const setDevMockOverride = useGeneralStore(state => state.setDevMockOverride)

  // Only show in development
  if (import.meta.env.MODE === 'production') {
    return null
  }

  const handleExpandClick = () => {
    setExpanded(!expanded)
  }

  const handleToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDevMockOverride(event.target.checked)
  }

  // Determine current mode for display
  const getCurrentMode = () => {
    if (devMockOverride !== null) {
      return devMockOverride ? 'MOCK (Override)' : 'REAL (Override)'
    }
    return serviceStatus?.usingMock ? 'MOCK (Default)' : 'REAL (Default)'
  }

  const isCurrentlyMock =
    devMockOverride !== null ? devMockOverride : serviceStatus?.usingMock

  return (
    <Paper
      elevation={1}
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: expanded ? 420 : 'auto',
        zIndex: 1300,
        transition: 'width 0.3s ease-in-out',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          cursor: 'pointer',
        }}
        onClick={handleExpandClick}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BugIcon fontSize="small" color="primary" />
          <Typography variant="body2" fontWeight="medium">
            Dev Status
          </Typography>
          {!expanded && (
            <Chip
              label={isCurrentlyMock ? 'MOCK DATA' : 'REAL DATA'}
              size="small"
              color={isCurrentlyMock ? 'warning' : 'success'}
              variant="outlined"
            />
          )}
        </Box>
        <IconButton
          size="small"
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s',
          }}
        >
          <ExpandMoreIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Expanded Content */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 0 }}>
          <Stack spacing={2}>
            {/* Mock/Real Toggle */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                <ToggleIcon
                  fontSize="small"
                  sx={{ mr: 1, verticalAlign: 'middle' }}
                />
                Service Mode
              </Typography>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={
                        devMockOverride !== null
                          ? devMockOverride
                          : serviceStatus?.usingMock || false
                      }
                      onChange={handleToggleChange}
                      color="warning"
                    />
                  }
                  label={<Typography variant="body2">Use Mock Data</Typography>}
                />
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip
                    label={getCurrentMode()}
                    size="small"
                    color={isCurrentlyMock ? 'warning' : 'success'}
                  />
                  <Chip
                    label={serviceStatus?.environment || 'Unknown'}
                    size="small"
                    variant="outlined"
                  />
                  {serviceStatus?.usingCloudFunction && !isCurrentlyMock && (
                    <Chip
                      label="Cloud Functions"
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  )}
                </Stack>
                {devMockOverride !== null && (
                  <Typography variant="caption" color="text.secondary">
                    Override active -{' '}
                    {devMockOverride ? 'forcing mock mode' : 'forcing real API'}
                  </Typography>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Rate Limiting Status - Only show for real API */}
            {!isCurrentlyMock && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Rate Limiting
                </Typography>
                <RateLimitIndicator
                  rateLimitInfo={rateLimitInfo}
                  isLoading={rateLimitLoading}
                  error={rateLimitError}
                />
              </Box>
            )}

            {/* Mock Mode Notice */}
            {isCurrentlyMock && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Mock Mode
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Using mock data - no rate limiting or API costs
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  )
}

export default DevStatus
