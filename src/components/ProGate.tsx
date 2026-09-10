import LockIcon from '@mui/icons-material/Lock'
import { Box, Chip, Tooltip } from '@mui/material'
import React from 'react'

interface ProGateProps {
  locked: boolean
  // What the user is being denied, in their words — "the aggressive risk level",
  // "your own sportsbook". Reads inside a sentence, so no leading capital.
  label: string
  onUpgrade: () => void
  children: React.ReactNode
}

// Wraps a control the current plan cannot use. The control stays rendered and
// legible rather than hidden: the spec's conversion moment is a good parlay the
// user wants to tweak, not an empty state after they have run out.
//
// The control itself is inert, so the click has to be caught above it — a
// disabled MUI control swallows pointer events and would leave the lock doing
// nothing when tapped.
const ProGate: React.FC<ProGateProps> = ({ locked, label, onUpgrade, children }) => {
  if (!locked) {
    return <>{children}</>
  }

  return (
    <Tooltip title={`Upgrade to Pro to use ${label}`}>
      {/* isolate keeps the overlay's z-index local instead of competing with
          the rest of the page. */}
      <Box sx={{ position: 'relative', isolation: 'isolate', display: 'inline-flex' }}>
        <Box
          aria-hidden
          sx={{
            display: 'inline-flex',
            opacity: 0.45,
            // Dimming alone can read as "still loading", so the badge below
            // carries the actual reason.
            filter: 'saturate(0.4)',
          }}
        >
          {children}
        </Box>

        <Box
          component="button"
          type="button"
          onClick={onUpgrade}
          aria-label={`Upgrade to Pro to use ${label}`}
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            border: 0,
            padding: 0,
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: 1,
            transition: 'background-color 150ms ease',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'secondary.main',
              outlineOffset: 2,
            },
          }}
        />

        <Chip
          icon={<LockIcon sx={{ fontSize: 14 }} />}
          label="Pro"
          size="small"
          sx={{
            position: 'absolute',
            top: -10,
            right: -10,
            zIndex: 2,
            height: 20,
            fontSize: 11,
            fontWeight: 600,
            pointerEvents: 'none',
            backgroundColor: 'secondary.main',
            color: '#121212',
            '& .MuiChip-icon': { color: '#121212', marginLeft: '4px' },
          }}
        />
      </Box>
    </Tooltip>
  )
}

export default ProGate
