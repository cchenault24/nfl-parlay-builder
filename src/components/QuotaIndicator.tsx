import { Box, Link, Typography } from '@mui/material'
import type { QuotaState } from '@shared/index'
import React from 'react'

interface QuotaIndicatorProps {
  quota: QuotaState
  onUpgrade: () => void
}

function resetLabel(resetsAt: string): string {
  const days = Math.ceil((Date.parse(resetsAt) - Date.now()) / (24 * 60 * 60 * 1000))
  if (days <= 1) {
    return 'Resets tomorrow'
  }
  return `Resets in ${days} days`
}

// Pro's allowance is uncapped and its fair-use valve is deliberately never
// surfaced, so there is nothing here to show a Pro user — rendering "unlimited"
// would just be noise on every screen.
const QuotaIndicator: React.FC<QuotaIndicatorProps> = ({ quota, onUpgrade }) => {
  if (quota.limit === null || quota.remaining === null) {
    return null
  }

  const exhausted = quota.remaining === 0

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 1,
        flexWrap: 'wrap',
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          // Column-aligned digits keep the number from shifting as it counts down.
          fontVariantNumeric: 'tabular-nums',
          color: exhausted ? 'text.secondary' : 'text.primary',
        }}
      >
        {exhausted
          ? 'No parlays left this week'
          : `${quota.remaining} of ${quota.limit} parlays left this week`}
      </Typography>

      <Typography variant="caption" color="text.secondary">
        {resetLabel(quota.resetsAt)}
      </Typography>

      <Link
        component="button"
        type="button"
        variant="caption"
        onClick={onUpgrade}
        sx={{
          fontWeight: 600,
          color: 'secondary.main',
          textDecorationColor: 'currentColor',
        }}
      >
        Go unlimited
      </Link>
    </Box>
  )
}

export default QuotaIndicator
