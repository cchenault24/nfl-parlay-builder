import { Box, Paper, Typography } from '@mui/material'
import React from 'react'
import type { RankedStat, TeamRef, TeamStats } from '../../types'
import RankChip from './RankChip'
import TeamLogo from './TeamLogo'

const StatRow: React.FC<{ label: string; stat?: RankedStat; unit?: string }> = ({
  label,
  stat,
  unit = '',
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {stat ? `${stat.value.toFixed(1)}${unit}` : '—'}
      </Typography>
      <RankChip rank={stat?.rank} />
    </Box>
  </Box>
)

export interface TeamCardProps {
  team: TeamRef
  stats: TeamStats | null
}

const TeamCard: React.FC<TeamCardProps> = ({ team, stats }) => (
  <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <TeamLogo teamName={team.name} size="small" />
      <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
        {team.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {team.record}
      </Typography>
    </Box>

    <Typography variant="overline" color="text.secondary">
      Offense · per game
    </Typography>
    <StatRow label="Passing yards" stat={stats?.offense.passingYardsPerGame} />
    <StatRow label="Rushing yards" stat={stats?.offense.rushingYardsPerGame} />
    <StatRow label="Points" stat={stats?.offense.pointsPerGame} />

    <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
      Defense · per game
    </Typography>
    <StatRow label="Yards allowed" stat={stats?.defense.yardsAllowedPerGame} />
    <StatRow label="Points allowed" stat={stats?.defense.pointsAllowedPerGame} />
    <StatRow label="Takeaways (season)" stat={stats?.defense.takeaways} />
  </Paper>
)

export default TeamCard
