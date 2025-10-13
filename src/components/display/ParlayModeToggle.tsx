import {
  Psychology as PsychologyIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material'
import {
  Box,
  Chip,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import React from 'react'
import useParlayStore, { type ParlayMode } from '../../store/parlayStore'

const ParlayModeToggle: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const parlayMode = useParlayStore(state => state.parlayMode)
  const setParlayMode = useParlayStore(state => state.setParlayMode)

  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setParlayMode(event.target.value as ParlayMode)
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          mb: 2,
          textAlign: 'center',
          fontSize: isMobile ? '0.9rem' : '1rem',
        }}
      >
        Choose Generation Mode
      </Typography>

      <FormControl component="fieldset" sx={{ width: '100%' }}>
        <RadioGroup
          value={parlayMode}
          onChange={handleModeChange}
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 2,
            justifyContent: 'center',
          }}
        >
          <FormControlLabel
            value="agentic"
            control={<Radio size="small" />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PsychologyIcon fontSize="small" color="primary" />
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: parlayMode === 'agentic' ? 600 : 400,
                      fontSize: isMobile ? '0.8rem' : '0.875rem',
                    }}
                  >
                    Agentic Mode
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: isMobile ? '0.7rem' : '0.75rem',
                      display: 'block',
                    }}
                  >
                    AI agent with weather & odds data
                  </Typography>
                </Box>
                {parlayMode === 'agentic' && (
                  <Chip
                    label="Recommended"
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ ml: 1, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            }
            sx={{
              border: parlayMode === 'agentic' ? '2px solid' : '1px solid',
              borderColor:
                parlayMode === 'agentic' ? 'primary.main' : 'divider',
              borderRadius: 2,
              px: 2,
              py: 1,
              m: 0,
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover',
              },
            }}
          />

          <FormControlLabel
            value="single-shot"
            control={<Radio size="small" />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SpeedIcon fontSize="small" color="action" />
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: parlayMode === 'single-shot' ? 600 : 400,
                      fontSize: isMobile ? '0.8rem' : '0.875rem',
                    }}
                  >
                    Single-Shot Mode
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: isMobile ? '0.7rem' : '0.75rem',
                      display: 'block',
                    }}
                  >
                    Fast AI generation
                  </Typography>
                </Box>
              </Box>
            }
            sx={{
              border: parlayMode === 'single-shot' ? '2px solid' : '1px solid',
              borderColor:
                parlayMode === 'single-shot' ? 'primary.main' : 'divider',
              borderRadius: 2,
              px: 2,
              py: 1,
              m: 0,
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover',
              },
            }}
          />
        </RadioGroup>
      </FormControl>
    </Box>
  )
}

export default ParlayModeToggle
