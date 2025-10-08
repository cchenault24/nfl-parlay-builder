import { Box, Divider, Paper, Typography } from '@mui/material'
import React from 'react'
import { PFRTeamStats } from '../../types'
import TeamLogo from './TeamLogo'

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

// Labels left here as reference for section order; currently unused since we render explicit rows

export interface TeamCardProps {
  name: string
  record: string
  stats?: PFRTeamStats | null
}

const TeamCard: React.FC<TeamCardProps> = ({ name, record, stats }) => {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 0.75,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TeamLogo teamName={name} size="small" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {name}
          </Typography>
        </Box>
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
        value={
          typeof stats?.offense?.values?.passingYards === 'number' ? (
            <Typography variant="body2">
              {stats.offense.values.passingYards} yards
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled">
              N/A
            </Typography>
          )
        }
      />
      <ValueRow
        label="Rushing Yards"
        value={
          typeof stats?.offense?.values?.rushingYards === 'number' ? (
            <Typography variant="body2">
              {stats.offense.values.rushingYards} yards
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled">
              N/A
            </Typography>
          )
        }
      />
      <ValueRow
        label="Points Scored"
        value={
          typeof stats?.offense?.values?.pointsPerGame === 'number' ? (
            <Typography variant="body2">
              {Math.round(
                stats.offense.values.pointsPerGame / Math.max(1, stats.week)
              )}{' '}
              points
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled">
              N/A
            </Typography>
          )
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
        <ValueRow
          label="Yards Allowed"
          value={
            typeof stats?.defense?.values?.totalYardsAllowed === 'number' ? (
              <Typography variant="body2">
                {Math.round(
                  stats.defense.values.totalYardsAllowed /
                    Math.max(1, stats.week)
                )}{' '}
                yards
              </Typography>
            ) : (
              <Typography variant="body2" color="text.disabled">
                N/A
              </Typography>
            )
          }
        />
        <ValueRow
          label="Points Allowed"
          value={
            typeof stats?.defense?.values?.pointsAllowed === 'number' ? (
              <Typography variant="body2">
                {Math.round(
                  stats.defense.values.pointsAllowed / Math.max(1, stats.week)
                )}{' '}
                points
              </Typography>
            ) : (
              <Typography variant="body2" color="text.disabled">
                N/A
              </Typography>
            )
          }
        />
        <ValueRow
          label="Takeaways"
          value={
            typeof stats?.defense?.values?.takeaways === 'number' ? (
              <Typography variant="body2">
                {(() => {
                  const avg =
                    stats.defense.values.takeaways / Math.max(1, stats.week)
                  return avg < 1 ? '< 1' : `${avg.toFixed(1)}`
                })()}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.disabled">
                N/A
              </Typography>
            )
          }
        />
        <Divider sx={{ my: 1 }} />
        <Typography variant="subtitle2" color="text.secondary" align="center">
          Averages per game
        </Typography>
      </Box>
    </Paper>
  )
}

export default TeamCard
