import {
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material'
import React from 'react'
import useParlayStore from '../../store/parlayStore'
import useRateLimitStore from '../../store/rateLimitStore'
import { AgentRunTimeline } from './AgentRunTimeline'

const ParlayLanding: React.FC = () => {
  const isAtLimit = useRateLimitStore(state => state.isAtLimit)

  // Hide the component when rate limited
  if (isAtLimit()) {
    return null
  }

  const selectedGame = useParlayStore(state => state.selectedGame)
  const [agentMode, setAgentMode] = React.useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('agentMode') === '1'
      : false
  )

  const toggleAgent = (_e: unknown, checked: boolean) => {
    setAgentMode(checked)
    if (typeof window !== 'undefined') {
      localStorage.setItem('agentMode', checked ? '1' : '0')
    }
  }

  return (
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Select a game and click &quot;Create 3-Leg Parlay&quot; to get started
        </Typography>
        <div
          style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}
        >
          <FormControlLabel
            control={<Switch checked={agentMode} onChange={toggleAgent} />}
            label="Agentic mode"
          />
        </div>
        {agentMode && selectedGame?.gameId && (
          <div style={{ marginTop: 16 }}>
            <AgentRunTimeline gameId={selectedGame.gameId} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ParlayLanding
