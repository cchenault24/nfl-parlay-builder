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

type Leaders = {
  passing?: { name: string; stats: string; value: number }
  rushing?: { name: string; stats: string; value: number }
  receiving?: { name: string; stats: string; value: number }
}

type TeamStats = {
  teamId: string
  teamName: string
  overallOffenseRank?: number
  overallDefenseRank?: number
  overallTeamRank?: number
  specialTeamsRank?: number | null
  offensiveRankings: {
    totalYards: { rank: number; yardsPerGame: number }
    passingYards: { rank: number; yardsPerGame: number }
    rushingYards: { rank: number; yardsPerGame: number }
    pointsScored: { rank: number; pointsPerGame: number }
    thirdDownConversion: { rank: number; percentage: number }
    redZoneEfficiency: { rank: number; percentage: number }
  }
  defensiveRankings: {
    totalYardsAllowed: { rank: number; yardsPerGame: number }
    passingYardsAllowed: { rank: number; yardsPerGame: number }
    rushingYardsAllowed: { rank: number; yardsPerGame: number }
    pointsAllowed: { rank: number; pointsPerGame: number }
    turnovers: { rank: number; total: number }
    sacks: { rank: number; total: number }
  }
}

type TeamSide = {
  teamId: string
  name: string
  abbrev: string
  overallRecord: string
  homeRecord: string
  roadRecord: string
  stats: TeamStats | null
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
  const offHome = home.stats?.offensiveRankings
  const offAway = away.stats?.offensiveRankings
  const defHome = home.stats?.defensiveRankings
  const defAway = away.stats?.defensiveRankings
  const ordinal = (n?: number) => {
    if (!n || n <= 0) return 'N/A'
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
                Offensive (per game)
              </Typography>
              {typeof offHome.totalYards?.yardsPerGame === 'number' &&
                typeof offAway.totalYards?.yardsPerGame === 'number' && (
                  <StatRow
                    label={`Total Yards (Rank #${offHome.totalYards.rank} vs #${offAway.totalYards.rank})`}
                    home={offHome.totalYards.yardsPerGame.toFixed(1)}
                    away={offAway.totalYards.yardsPerGame.toFixed(1)}
                  />
                )}
              {typeof offHome.passingYards?.yardsPerGame === 'number' &&
                typeof offAway.passingYards?.yardsPerGame === 'number' && (
                  <StatRow
                    label={`Passing Yards (Rank #${offHome.passingYards.rank} vs #${offAway.passingYards.rank})`}
                    home={offHome.passingYards.yardsPerGame.toFixed(1)}
                    away={offAway.passingYards.yardsPerGame.toFixed(1)}
                  />
                )}
              {typeof offHome.rushingYards?.yardsPerGame === 'number' &&
                typeof offAway.rushingYards?.yardsPerGame === 'number' && (
                  <StatRow
                    label={`Rushing Yards (Rank #${offHome.rushingYards.rank} vs #${offAway.rushingYards.rank})`}
                    home={offHome.rushingYards.yardsPerGame.toFixed(1)}
                    away={offAway.rushingYards.yardsPerGame.toFixed(1)}
                  />
                )}
              {typeof offHome.pointsScored?.pointsPerGame === 'number' &&
                typeof offAway.pointsScored?.pointsPerGame === 'number' && (
                  <StatRow
                    label={`Points (Rank #${offHome.pointsScored.rank} vs #${offAway.pointsScored.rank})`}
                    home={offHome.pointsScored.pointsPerGame.toFixed(1)}
                    away={offAway.pointsScored.pointsPerGame.toFixed(1)}
                  />
                )}
              {typeof offHome.thirdDownConversion?.percentage === 'number' &&
                typeof offAway.thirdDownConversion?.percentage === 'number' && (
                  <StatRow
                    label="3rd Down %"
                    home={`${offHome.thirdDownConversion.percentage.toFixed(1)}%`}
                    away={`${offAway.thirdDownConversion.percentage.toFixed(1)}%`}
                  />
                )}
              {typeof offHome.redZoneEfficiency?.percentage === 'number' &&
                typeof offAway.redZoneEfficiency?.percentage === 'number' && (
                  <StatRow
                    label="Red Zone %"
                    home={`${offHome.redZoneEfficiency.percentage.toFixed(1)}%`}
                    away={`${offAway.redZoneEfficiency.percentage.toFixed(1)}%`}
                  />
                )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
                gutterBottom
              >
                Defense (per game)
              </Typography>
              {defHome &&
                defAway &&
                typeof defHome.totalYardsAllowed?.yardsPerGame === 'number' &&
                typeof defAway.totalYardsAllowed?.yardsPerGame === 'number' && (
                  <StatRow
                    label={`Yards Allowed (Rank #${defHome.totalYardsAllowed.rank} vs #${defAway.totalYardsAllowed.rank})`}
                    home={defHome.totalYardsAllowed.yardsPerGame.toFixed(1)}
                    away={defAway.totalYardsAllowed.yardsPerGame.toFixed(1)}
                  />
                )}
              {defHome &&
                defAway &&
                typeof defHome.passingYardsAllowed?.yardsPerGame === 'number' &&
                typeof defAway.passingYardsAllowed?.yardsPerGame ===
                  'number' && (
                  <StatRow
                    label={`Pass Yds Allowed (Rank #${defHome.passingYardsAllowed.rank} vs #${defAway.passingYardsAllowed.rank})`}
                    home={defHome.passingYardsAllowed.yardsPerGame.toFixed(1)}
                    away={defAway.passingYardsAllowed.yardsPerGame.toFixed(1)}
                  />
                )}
              {defHome &&
                defAway &&
                typeof defHome.rushingYardsAllowed?.yardsPerGame === 'number' &&
                typeof defAway.rushingYardsAllowed?.yardsPerGame ===
                  'number' && (
                  <StatRow
                    label={`Rush Yds Allowed (Rank #${defHome.rushingYardsAllowed.rank} vs #${defAway.rushingYardsAllowed.rank})`}
                    home={defHome.rushingYardsAllowed.yardsPerGame.toFixed(1)}
                    away={defAway.rushingYardsAllowed.yardsPerGame.toFixed(1)}
                  />
                )}
              {defHome &&
                defAway &&
                typeof defHome.pointsAllowed?.pointsPerGame === 'number' &&
                typeof defAway.pointsAllowed?.pointsPerGame === 'number' && (
                  <StatRow
                    label={`Points Allowed (Rank #${defHome.pointsAllowed.rank} vs #${defAway.pointsAllowed.rank})`}
                    home={defHome.pointsAllowed.pointsPerGame.toFixed(1)}
                    away={defAway.pointsAllowed.pointsPerGame.toFixed(1)}
                  />
                )}
              {defHome &&
                defAway &&
                typeof defHome.turnovers?.total === 'number' &&
                typeof defAway.turnovers?.total === 'number' && (
                  <StatRow
                    label={`Turnovers (Rank #${defHome.turnovers.rank} vs #${defAway.turnovers.rank})`}
                    home={defHome.turnovers.total}
                    away={defAway.turnovers.total}
                  />
                )}
              {defHome &&
                defAway &&
                typeof defHome.sacks?.total === 'number' &&
                typeof defAway.sacks?.total === 'number' && (
                  <StatRow
                    label={`Sacks (Rank #${defHome.sacks.rank} vs #${defAway.sacks.rank})`}
                    home={defHome.sacks.total}
                    away={defAway.sacks.total}
                  />
                )}
            </Grid>
          </Grid>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

export default GameStatsPanel
