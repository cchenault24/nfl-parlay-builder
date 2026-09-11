import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from '@mui/material'
import React, { useEffect, useState } from 'react'
import {
  formatElapsed,
  RUN_DURATION_ESTIMATE,
  STEP_ROWS,
} from '@shared/agentSteps'
import type { AgentStep } from '../../types'

const ROWS = STEP_ROWS

interface AgentProgressProps {
  steps: AgentStep[]
  isMockMode: boolean
  onCancel: () => void
}

function StatusGlyph({ step }: { step?: AgentStep }) {
  const base = {
    width: 20,
    height: 20,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  }
  if (!step) {
    return <Box sx={{ ...base, border: '1.5px solid', borderColor: 'divider' }} />
  }
  if (step.status === 'running') {
    return <CircularProgress size={16} thickness={5} sx={{ mx: '2px' }} />
  }
  if (step.status === 'failed') {
    return (
      <Box sx={{ ...base, bgcolor: 'warning.dark', color: 'warning.contrastText' }}>
        <CloseIcon sx={{ fontSize: 13 }} />
      </Box>
    )
  }
  return (
    <Box sx={{ ...base, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
      <CheckIcon sx={{ fontSize: 13 }} />
    </Box>
  )
}

const AgentProgress: React.FC<AgentProgressProps> = ({
  steps,
  isMockMode,
  onCancel,
}) => {
  const [startedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 250)
    return () => clearInterval(t)
  }, [startedAt])

  const byId = new Map(steps.map(s => [s.id, s]))

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            mb: 2.5,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              {isMockMode ? 'Simulating a parlay' : 'Building your parlay'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Each step reports as it finishes. {RUN_DURATION_ESTIMATE}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, ml: 2 }}
          >
            {formatElapsed(elapsed)}
          </Typography>
        </Box>

        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {ROWS.map(row => {
            const step = byId.get(row.id)
            const pending = !step
            const failed = step?.status === 'failed'
            return (
              <Box
                component="li"
                key={row.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 1,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  '&:first-of-type': { borderTop: 0 },
                }}
              >
                <StatusGlyph step={step} />
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    color: pending ? 'text.disabled' : 'text.primary',
                    fontWeight: step?.status === 'running' ? 600 : 400,
                    transition: 'color 150ms ease',
                  }}
                >
                  {row.label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: failed ? 'warning.main' : 'text.secondary',
                    fontVariantNumeric: 'tabular-nums',
                    textAlign: 'right',
                  }}
                >
                  {failed
                    ? row.optional
                      ? 'unavailable — continuing'
                      : step.error?.message ?? 'failed'
                    : step?.durationMs !== undefined
                      ? `${(step.durationMs / 1000).toFixed(1)}s`
                      : ''}
                </Typography>
              </Box>
            )
          })}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button size="small" color="inherit" onClick={onCancel}>
            Cancel
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}

export default AgentProgress
