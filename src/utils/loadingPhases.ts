import {
  Analytics as AnalyticsIcon,
  AutoFixHigh as AutoFixHighIcon,
  DataUsage as DataUsageIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material'
import React from 'react'
import { LoadingPhase } from '../types/loading'
import { responseTimeTracker } from './responseTimeTracker'

// Phase distribution percentages for real API calls
const REAL_API_PHASE_DISTRIBUTION = {
  retrieving_stats: 0.3, // 30% of total time
  analyzing_stats: 0.4, // 40% of total time
  generating_parlay: 0.3, // 30% of total time
}

export const getRealApiPhases = (): LoadingPhase[] => {
  const estimatedTime = responseTimeTracker.getEstimatedTime()

  // Ensure we have a valid estimated time
  const validEstimatedTime = estimatedTime > 0 ? estimatedTime : 20000

  return [
    {
      id: 'retrieving_stats',
      title: 'Retrieving Stats',
      description: 'Getting latest team and player statistics...',
      duration: Math.round(
        validEstimatedTime * REAL_API_PHASE_DISTRIBUTION.retrieving_stats
      ),
      icon: React.createElement(DataUsageIcon),
    },
    {
      id: 'analyzing_stats',
      title: 'Analyzing Stats',
      description: 'Processing team performance and trends...',
      duration: Math.round(
        validEstimatedTime * REAL_API_PHASE_DISTRIBUTION.analyzing_stats
      ),
      icon: React.createElement(AnalyticsIcon),
    },
    {
      id: 'generating_parlay',
      title: 'Generating Parlay',
      description: 'AI is creating your personalized picks...',
      duration: Math.round(
        validEstimatedTime * REAL_API_PHASE_DISTRIBUTION.generating_parlay
      ),
      icon: React.createElement(AutoFixHighIcon),
    },
  ]
}

export const MOCK_PHASES: LoadingPhase[] = [
  {
    id: 'simulating',
    title: 'Simulating Generation',
    description: 'Creating mock parlay data...',
    duration: 2000,
    icon: React.createElement(PlayArrowIcon),
  },
]

export const getPhasesForMode = (isMockMode: boolean): LoadingPhase[] => {
  return isMockMode ? MOCK_PHASES : getRealApiPhases()
}

export const getTotalEstimatedTime = (isMockMode: boolean): number => {
  const phases = getPhasesForMode(isMockMode)
  return phases.reduce((total, phase) => total + phase.duration, 0)
}

export const getPhaseById = (
  phaseId: string,
  isMockMode: boolean
): LoadingPhase | undefined => {
  const phases = getPhasesForMode(isMockMode)
  return phases.find(phase => phase.id === phaseId)
}
