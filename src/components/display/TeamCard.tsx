import { Box, Paper, Typography } from '@mui/material'
import React from 'react'
import { PFRTeamStats } from '../../types'
import RankChip from './RankChip'

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

const HeaderRow: React.FC = () => (
  <Box sx={{ display: 'flex', justifyContent: 'flex-end', py: 0.5, mb: 0.25 }}>
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontWeight: 600, minWidth: 40, textAlign: 'center' }}
      >
        Value
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontWeight: 600, minWidth: 40, textAlign: 'center' }}
      >
        Rank
      </Typography>
    </Box>
  </Box>
)

// Labels left here as reference for section order; currently unused since we render explicit rows

export interface TeamCardProps {
  name: string
  record: string
  stats?: PFRTeamStats | null
}

const TeamCard: React.FC<TeamCardProps> = ({ name, record, stats }) => {
  const off = stats?.offense?.rankings
  const def = stats?.defense?.rankings
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
      <HeaderRow />
      <ValueRow
        label="Passing Yards"
        value={
          <>
            {typeof stats?.offense?.values?.passingYards === 'number' && (
              <Typography
                variant="body2"
                sx={{ mr: 1, minWidth: 40, textAlign: 'center' }}
              >
                {stats?.offense?.values?.passingYards} ypg
              </Typography>
            )}
            <RankChip rank={off?.passingYardsRank} />
          </>
        }
      />
      <ValueRow
        label="Rushing Yards"
        value={
          <>
            {typeof stats?.offense?.values?.rushingYards === 'number' && (
              <Typography
                variant="body2"
                sx={{ mr: 1, minWidth: 40, textAlign: 'center' }}
              >
                {stats?.offense?.values?.rushingYards} ypg
              </Typography>
            )}
            <RankChip rank={off?.rushingYardsRank} />
          </>
        }
      />
      <ValueRow
        label="Points Per Game"
        value={
          <>
            {typeof stats?.offense?.values?.pointsPerGame === 'number' && (
              <Typography
                variant="body2"
                sx={{ mr: 1, minWidth: 40, textAlign: 'center' }}
              >
                {stats?.offense?.values?.pointsPerGame} ppg
              </Typography>
            )}
            <RankChip rank={off?.pointsScoredRank} />
          </>
        }
      />

      <Box sx={{ mt: 1.25 }}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, mb: 0.5 }}
          gutterBottom={false}
        >
          Defense
        </Typography>
        <HeaderRow />
        <ValueRow
          label="Yards Allowed"
          value={
            <>
              {typeof stats?.defense?.values?.totalYardsAllowed ===
                'number' && (
                <Typography
                  variant="body2"
                  sx={{ mr: 1, minWidth: 40, textAlign: 'center' }}
                >
                  {stats?.defense?.values?.totalYardsAllowed} ypg
                </Typography>
              )}
              <RankChip rank={def?.totalYardsAllowedRank} />
            </>
          }
        />
        <ValueRow
          label="Points Allowed"
          value={
            <>
              {typeof stats?.defense?.values?.pointsAllowed === 'number' && (
                <Typography
                  variant="body2"
                  sx={{ mr: 1, minWidth: 40, textAlign: 'center' }}
                >
                  {stats?.defense?.values?.pointsAllowed} ppg
                </Typography>
              )}
              <RankChip rank={def?.pointsAllowedRank} />
            </>
          }
        />
        <ValueRow
          label="Takeaways"
          value={
            <>
              {typeof stats?.defense?.values?.takeaways === 'number' && (
                <Typography
                  variant="body2"
                  sx={{ mr: 1, minWidth: 40, textAlign: 'center' }}
                >
                  {stats?.defense?.values?.takeaways}
                </Typography>
              )}
              <RankChip rank={def?.turnoversRank} />
            </>
          }
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
