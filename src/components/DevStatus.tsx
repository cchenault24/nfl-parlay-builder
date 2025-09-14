import {
  Api as ApiIcon,
  BugReport as BugIcon,
  ExpandLess as CollapseIcon,
  ExpandMore as ExpandIcon,
  SmartToy as MockIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import {
  Box,
  Chip,
  Collapse,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import React from 'react'
import useGeneralStore from '../store/generalStore'

/**
 * Development Status Component with Mock/Real API Toggle
 * Shows current service configuration and allows switching in development mode
 * Only visible in development environment
 * Default: Uses mock data unless explicitly disabled
 */

interface DevStatusProps {
  className?: string
}

export const DevStatus: React.FC<DevStatusProps> = ({ className }) => {
  const [expanded, setExpanded] = React.useState(false)

  const devMockOverride = useGeneralStore(state => state.devMockOverride)
  const setDevMockOverride = useGeneralStore(state => state.setDevMockOverride)

  // Only show in development
  if (import.meta.env.MODE !== 'development') {
    return null
  }

  // Determine service status with override
  const getServiceStatus = () => {
    // If there's an override, use it
    if (devMockOverride !== null) {
      return {
        usingMock: devMockOverride,
        environment: import.meta.env.MODE || 'development',
        isOverridden: true,
      }
    }

    const shouldUseMock = import.meta.env.VITE_USE_MOCK_OPENAI !== 'false' // Default to true unless explicitly set to 'false'

    return {
      usingMock: shouldUseMock,
      environment: import.meta.env.MODE || 'development',
      isOverridden: false,
    }
  }

  const status = getServiceStatus()

  const toggleExpanded = () => setExpanded(!expanded)

  const handleToggleService = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked
    setDevMockOverride(newValue)

    // Show a message that the change will take effect on next action
    console.log(
      `🔄 Service switched to ${newValue ? 'Mock' : 'Cloud Functions'} API. Generate a new parlay to see the change.`
    )
  }

  return (
    <Paper
      className={className}
      elevation={1}
      sx={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        maxWidth: 380,
      }}
    >
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <BugIcon sx={{ color: '#ff9800', fontSize: 20 }} />
          <Typography variant="caption" sx={{ color: '#fff', fontWeight: 500 }}>
            Dev Mode
          </Typography>

          <Chip
            icon={status.usingMock ? <MockIcon /> : <ApiIcon />}
            label={status.usingMock ? 'Mock API' : 'Cloud Functions'}
            color={status.usingMock ? 'success' : 'warning'}
            size="small"
            variant="outlined"
          />

          {status.isOverridden && (
            <Chip
              label="Override"
              color="info"
              size="small"
              variant="filled"
              sx={{ fontSize: '0.6rem' }}
            />
          )}

          <IconButton
            onClick={toggleExpanded}
            size="small"
            sx={{ color: '#fff' }}
          >
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        </Stack>

        <Collapse in={expanded}>
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Stack spacing={2}>
              {/* Service Toggle */}
              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <SettingsIcon
                      sx={{ color: 'text.secondary', fontSize: 16 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      API Service:
                    </Typography>
                  </Stack>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={status.usingMock}
                        onChange={handleToggleService}
                        size="small"
                        color="success"
                      />
                    }
                    label={
                      <Typography
                        variant="caption"
                        color={
                          status.usingMock ? 'success.main' : 'warning.main'
                        }
                      >
                        {status.usingMock ? 'Mock' : 'Cloud Functions'}
                      </Typography>
                    }
                    sx={{ m: 0 }}
                  />
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Collapse>
      </Box>
    </Paper>
  )
}

export default DevStatus
