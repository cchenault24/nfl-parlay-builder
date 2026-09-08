import { BugReport as BugIcon } from '@mui/icons-material'
import { Box, Chip, FormControlLabel, Paper, Switch, Typography } from '@mui/material'
import React from 'react'
import useGeneralStore from '../store/generalStore'

// Development-only switch between the live agent and the local mock service.
const DevStatus: React.FC = () => {
  const devMockOverride = useGeneralStore(state => state.devMockOverride)
  const setDevMockOverride = useGeneralStore(state => state.setDevMockOverride)

  if (import.meta.env.MODE === 'production') {
    return null
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        px: 2,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        zIndex: 1300,
      }}
    >
      <BugIcon fontSize="small" color="primary" />
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        Dev
      </Typography>
      <FormControlLabel
        sx={{ m: 0 }}
        control={
          <Switch
            size="small"
            checked={devMockOverride}
            onChange={e => setDevMockOverride(e.target.checked)}
            color="warning"
          />
        }
        label={<Typography variant="body2">Mock data</Typography>}
      />
      <Chip
        label={devMockOverride ? 'mock' : 'live agent'}
        size="small"
        color={devMockOverride ? 'warning' : 'success'}
        variant="outlined"
      />
      <Box component="span" sx={{ typography: 'caption', color: 'text.secondary' }}>
        {import.meta.env.MODE}
      </Box>
    </Paper>
  )
}

export default DevStatus
