import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  Grid,
  Typography,
} from '@mui/material'
import React from 'react'
import { PFRTeamStats } from '../../types'

type Leaders = {
  passing?: { name: string; stats: string; value: number }
  rushing?: { name: string; stats: string; value: number }
  receiving?: { name: string; stats: string; value: number }
}

type TeamSide = {
  teamId: string
  name: string
  abbrev: string
  record: string
  overallRecord: string
  homeRecord: string
  roadRecord: string
  stats: PFRTeamStats | null
}

export interface GameStatsPanelProps {
  home: TeamSide
  away: TeamSide
  leaders?: Leaders
  context?: string
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
  venue: { name: string; city: string; state: string }
  weather?: { condition: string; temperatureF: number; windMph: number }
  rosterHome?: Array<{ playerId: string; name: string; position?: string }>
  rosterAway?: Array<{ playerId: string; name: string; position?: string }>
}

const StatRow: React.FC<{
  label: string
  home: string | number
  away: string | number
}> = ({ label, home, away }) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Typography variant="body2">{away}</Typography>
        <Typography variant="body2" color="text.disabled">
          @
        </Typography>
        <Typography variant="body2">{home}</Typography>
      </Box>
    </Box>
  )
}

const GameStatsPanel: React.FC<GameStatsPanelProps> = ({
  home,
  away,
  leaders,
  context,
  status,
  venue,
  weather,
  rosterHome,
  rosterAway,
}) => {
  const offHome = home.stats?.offenseRankings
  const offAway = away.stats?.offenseRankings
  const defHome = home.stats?.defenseRankings
  const defAway = away.stats?.defenseRankings
  const ordinal = (n?: number) => {
    if (!n || n <= 0) {
      return 'N/A'
    }
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  return (
    <Accordion sx={{ mb: 3 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Game Statistics</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {/* Exact text used in AI prompt (optional transparency) */}
        {context && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {context}
            </Typography>
            <Divider sx={{ my: 2 }} />
          </Box>
        )}

        {/* Game info used by AI */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
            Game Info
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Status: {status}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Venue: {venue.name}, {venue.city}, {venue.state}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Weather:{' '}
              {weather
                ? `${weather.condition}, ${weather.temperatureF}°F, ${weather.windMph} mph winds`
                : 'Not available'}
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />

        {(rosterHome?.length || rosterAway?.length) && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
                gutterBottom
              >
                Roster (Home)
              </Typography>
              {(rosterHome || [])
                .slice()
                .sort((a, b) =>
                  (a.position || '').localeCompare(b.position || '')
                )
                .slice(0, 16)
                .map(p => (
                  <Typography
                    key={`${p.playerId}-${p.name}`}
                    variant="body2"
                    color="text.secondary"
                  >
                    • {p.name}
                    {p.position ? ` (${p.position})` : ''}
                  </Typography>
                ))}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
                gutterBottom
              >
                Roster (Away)
              </Typography>
              {(rosterAway || [])
                .slice()
                .sort((a, b) =>
                  (a.position || '').localeCompare(b.position || '')
                )
                .slice(0, 16)
                .map(p => (
                  <Typography
                    key={`${p.playerId}-${p.name}`}
                    variant="body2"
                    color="text.secondary"
                  >
                    • {p.name}
                    {p.position ? ` (${p.position})` : ''}
                  </Typography>
                ))}
            </Grid>
          </Grid>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600 }}
              gutterBottom
            >
              Team Records
            </Typography>
            <StatRow
              label="Overall"
              home={home.overallRecord}
              away={away.overallRecord}
            />
            <StatRow
              label="Home/Away"
              home={home.homeRecord}
              away={away.roadRecord}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600 }}
              gutterBottom
            >
              Leaders
            </Typography>
            {leaders?.passing && (
              <StatRow
                label="Passing"
                home={leaders.passing.name}
                away={leaders.passing.stats}
              />
            )}
            {leaders?.rushing && (
              <StatRow
                label="Rushing"
                home={leaders.rushing.name}
                away={leaders.rushing.stats}
              />
            )}
            {leaders?.receiving && (
              <StatRow
                label="Receiving"
                home={leaders.receiving.name}
                away={leaders.receiving.stats}
              />
            )}
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {offHome && offAway && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
                gutterBottom
              >
                Matchup Rankings
              </Typography>
              <StatRow
                label={`Home Offense (${ordinal(home.stats?.overallOffenseRank)}) vs Away Defense (${ordinal(away.stats?.overallDefenseRank)})`}
                home={ordinal(home.stats?.overallOffenseRank)}
                away={ordinal(away.stats?.overallDefenseRank)}
              />
              <StatRow
                label={`Away Offense (${ordinal(away.stats?.overallOffenseRank)}) vs Home Defense (${ordinal(home.stats?.overallDefenseRank)})`}
                home={ordinal(away.stats?.overallOffenseRank)}
                away={ordinal(home.stats?.overallDefenseRank)}
              />
              <StatRow
                label={`Overall Team Rank: Home (${ordinal(home.stats?.overallTeamRank)}) vs Away (${ordinal(away.stats?.overallTeamRank)})`}
                home={ordinal(home.stats?.overallTeamRank)}
                away={ordinal(away.stats?.overallTeamRank)}
              />
              <Divider sx={{ my: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
                gutterBottom
              >
                Offensive Rankings
              </Typography>
              {offHome && offAway && (
                <>
                  <StatRow
                    label={`Total Yards (Rank #${offHome?.totalYardsRank || 'N/A'} vs #${offAway?.totalYardsRank || 'N/A'})`}
                    home={`#${offHome?.totalYardsRank || 'N/A'}`}
                    away={`#${offAway?.totalYardsRank || 'N/A'}`}
                  />
                  <StatRow
                    label={`Passing Yards (Rank #${offHome?.passingYardsRank || 'N/A'} vs #${offAway?.passingYardsRank || 'N/A'})`}
                    home={`#${offHome?.passingYardsRank || 'N/A'}`}
                    away={`#${offAway?.passingYardsRank || 'N/A'}`}
                  />
                  <StatRow
                    label={`Rushing Yards (Rank #${offHome?.rushingYardsRank || 'N/A'} vs #${offAway?.rushingYardsRank || 'N/A'})`}
                    home={`#${offHome?.rushingYardsRank || 'N/A'}`}
                    away={`#${offAway?.rushingYardsRank || 'N/A'}`}
                  />
                  <StatRow
                    label={`Points Scored (Rank #${offHome?.pointsScoredRank || 'N/A'} vs #${offAway?.pointsScoredRank || 'N/A'})`}
                    home={`#${offHome?.pointsScoredRank || 'N/A'}`}
                    away={`#${offAway?.pointsScoredRank || 'N/A'}`}
                  />
                </>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
                gutterBottom
              >
                Defensive Rankings
              </Typography>
              {defHome && defAway && (
                <>
                  <StatRow
                    label={`Yards Allowed (Rank #${defHome?.totalYardsAllowedRank || 'N/A'} vs #${defAway?.totalYardsAllowedRank || 'N/A'})`}
                    home={`#${defHome?.totalYardsAllowedRank || 'N/A'}`}
                    away={`#${defAway?.totalYardsAllowedRank || 'N/A'}`}
                  />
                  <StatRow
                    label={`Points Allowed (Rank #${defHome?.pointsAllowedRank || 'N/A'} vs #${defAway?.pointsAllowedRank || 'N/A'})`}
                    home={`#${defHome?.pointsAllowedRank || 'N/A'}`}
                    away={`#${defAway?.pointsAllowedRank || 'N/A'}`}
                  />
                  <StatRow
                    label={`Turnovers (Rank #${defHome?.turnoversRank || 'N/A'} vs #${defAway?.turnoversRank || 'N/A'})`}
                    home={`#${defHome?.turnoversRank || 'N/A'}`}
                    away={`#${defAway?.turnoversRank || 'N/A'}`}
                  />
                </>
              )}
            </Grid>
          </Grid>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

export default GameStatsPanel
