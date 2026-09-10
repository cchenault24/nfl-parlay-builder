import LockIcon from '@mui/icons-material/Lock'
import { Box, Button, Card, CardContent, Chip, Divider, Typography } from '@mui/material'
import React from 'react'
import type { GeneratedParlay } from '../../types'
import { computeTrackRecord, type Tally } from '../../utils/trackRecord'

const NUM = { fontVariantNumeric: 'tabular-nums' } as const

function pct(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`
}

function record(t: Tally): string {
  return t.push > 0 ? `${t.won}-${t.lost}-${t.push}` : `${t.won}-${t.lost}`
}

const Stat: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({
  label,
  children,
  hint,
}) => (
  <Box sx={{ minWidth: 96 }}>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      {label}
    </Typography>
    {children}
    {hint && (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {hint}
      </Typography>
    )}
  </Box>
)

interface RowProps {
  label: React.ReactNode
  claimed: React.ReactNode
  actual: React.ReactNode
  count: React.ReactNode
  header?: boolean
}

const Row: React.FC<RowProps> = ({ label, claimed, actual, count, header }) => {
  const cell = (align: 'left' | 'right') => ({
    ...NUM,
    textAlign: align,
    fontWeight: header ? 600 : 400,
  })
  const color = header ? 'text.secondary' : 'text.primary'
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr 0.8fr 0.6fr',
        gap: 1,
        py: 0.75,
        borderTop: header ? 0 : '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" color={color} sx={cell('left')}>
        {label}
      </Typography>
      <Typography variant="caption" color={color} sx={cell('right')}>
        {claimed}
      </Typography>
      <Typography variant="caption" color={color} sx={cell('right')}>
        {actual}
      </Typography>
      <Typography variant="caption" color={color} sx={cell('right')}>
        {count}
      </Typography>
    </Box>
  )
}

interface TrackRecordProps {
  parlays: GeneratedParlay[]
  // Free does not get the performance record. The panel still occupies its
  // place rather than vanishing: the spec's conversion moment is a user looking
  // at parlays they already like, not an empty state.
  locked?: boolean
  onUpgrade?: () => void
}

export const TrackRecord: React.FC<TrackRecordProps> = ({
  parlays,
  locked = false,
  onUpgrade,
}) => {
  if (locked) {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
              Track record
            </Typography>
            <Chip
              icon={<LockIcon sx={{ fontSize: 14 }} />}
              label="Pro"
              size="small"
              sx={{
                height: 20,
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: 'secondary.main',
                color: '#121212',
                '& .MuiChip-icon': { color: '#121212', marginLeft: '4px' },
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Win rate, closing line value and stated-confidence accuracy across every
            parlay you have saved.
          </Typography>
          {onUpgrade && (
            <Button size="small" onClick={onUpgrade} sx={{ mt: 1, px: 0 }}>
              See what Pro includes
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const t = computeTrackRecord(parlays)

  if (t.parlays.settled === 0) {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t.unresolvedParlays > 0
              ? `No settled results yet — ${t.unresolvedParlays} ${t.unresolvedParlays === 1 ? 'parlay is' : 'parlays are'} still unresolved.`
              : 'Save a parlay and your record will build here once the games finish.'}
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const clv = t.averageClvPoints

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ py: 2.5 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
          {/* The headline: whether the picks beat the market, which reads
              long before a win rate on this sample size does. */}
          <Stat
            label="Closing line value"
            hint={
              t.clvJudgedLegs > 0
                ? `${t.clvJudgedLegs} ${t.clvJudgedLegs === 1 ? 'leg' : 'legs'} measured`
                : 'not measured yet'
            }
          >
            <Typography
              variant="h4"
              sx={{
                ...NUM,
                fontWeight: 600,
                lineHeight: 1.1,
                color:
                  clv === null ? 'text.disabled' : clv > 0 ? 'success.main' : clv < 0 ? 'error.main' : 'text.primary',
              }}
            >
              {clv === null ? '—' : `${clv > 0 ? '+' : ''}${clv.toFixed(1)}`}
            </Typography>
          </Stat>

          <Stat label="Parlays" hint={`${pct(t.parlays.winRate)} win rate`}>
            <Typography variant="h6" sx={{ ...NUM, fontWeight: 600, lineHeight: 1.3 }}>
              {record(t.parlays)}
            </Typography>
          </Stat>

          <Stat label="Legs" hint={`${pct(t.legs.winRate)} win rate`}>
            <Typography variant="h6" sx={{ ...NUM, fontWeight: 600, lineHeight: 1.3 }}>
              {record(t.legs)}
            </Typography>
          </Stat>

          {t.unresolvedParlays > 0 && (
            <Stat label="Unresolved">
              <Typography variant="h6" sx={{ ...NUM, fontWeight: 600, lineHeight: 1.3 }}>
                {t.unresolvedParlays}
              </Typography>
            </Stat>
          )}
        </Box>

        {t.byConfidence.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Stated confidence vs. reality
            </Typography>
            <Row header label="Confidence" claimed="Claimed" actual="Actual" count="Legs" />
            {t.byConfidence.map(b => (
              <Row
                key={b.label}
                label={b.label}
                claimed={pct(b.statedConfidence)}
                actual={pct(b.actualWinRate)}
                count={b.legs}
              />
            ))}
          </>
        )}

        {t.byBetType.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              By bet type
            </Typography>
            <Row header label="Type" claimed="Record" actual="Win rate" count="Legs" />
            {t.byBetType.map(b => (
              <Row
                key={b.betType}
                label={b.betType.replace(/_/g, ' ')}
                claimed={record(b)}
                actual={pct(b.winRate)}
                count={b.settled}
              />
            ))}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default TrackRecord
