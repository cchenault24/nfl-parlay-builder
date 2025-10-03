import { Box, Chip, Paper, Typography } from '@mui/material'
import React from 'react'
import { PFRTeamStats } from '../../types'

const ValueRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
      {label}
    </Typography>
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>{value}</Box>
  </Box>
)

const RankChip: React.FC<{ rank?: number | null }> = ({ rank }) => {
  const getColor = (r?: number | null) => {
    if (!r || r <= 0) return 'default'
    if (r <= 10) return 'success'
    if (r <= 22) return 'warning'
    return 'error'
  }

  const label = rank && rank > 0 ? `${rank}` : 'N/A'
  return (
    <Chip
      label={label}
      color={getColor(rank) as any}
      size="small"
      sx={{ fontWeight: 700 }}
    />
  )
}

// Labels left here as reference for section order; currently unused since we render explicit rows

export interface TeamCardProps {
  name: string
  record: string
  stats?: PFRTeamStats | null
}

const TeamCard: React.FC<TeamCardProps> = ({ name, record, stats }) => {
  const off = stats?.offenseRankings
  const def = stats?.defenseRankings
  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {name}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {record}
        </Typography>
      </Box>

      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 600, mb: 0.5 }}
        gutterBottom={false}
      >
        Offense
      </Typography>
      <ValueRow
        label="Passing Yards"
        value={<RankChip rank={off?.passingYardsRank} />}
      />
      <ValueRow
        label="Rushing Yards"
        value={<RankChip rank={off?.rushingYardsRank} />}
      />
      <ValueRow
        label="Points Per Game"
        value={<RankChip rank={off?.pointsScoredRank} />}
      />

      <Box sx={{ mt: 1.25 }}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, mb: 0.5 }}
          gutterBottom={false}
        >
          Defense
        </Typography>
        <ValueRow
          label="Yards Allowed"
          value={<RankChip rank={def?.totalYardsAllowedRank} />}
        />
        <ValueRow
          label="Points Allowed"
          value={<RankChip rank={def?.pointsAllowedRank} />}
        />
        <ValueRow
          label="Takeaways"
          value={<RankChip rank={def?.turnoversRank} />}
        />
        <ValueRow
          label="Turnover Diff"
          value={<Typography variant="body2">N/A</Typography>}
        />
      </Box>
    </Paper>
  )
}

export default TeamCard
