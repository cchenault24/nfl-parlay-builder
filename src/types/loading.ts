import { ReactNode } from 'react'

export interface LoadingPhase {
  id: string
  title: string
  description: string
  duration: number // estimated duration in ms
  icon?: ReactNode
}

export interface LoadingProgress {
  currentPhase: string
  phaseProgress: number // 0-100
  overallProgress: number // 0-100
  estimatedTimeRemaining: number
  isMockMode: boolean
}

export interface DynamicParlayLoadingProps {
  isMockMode: boolean
}

export interface LoadingContext {
  isActive: boolean
  currentPhase: string
  progress: number
  isMockMode: boolean
  elapsedTime: number
  estimatedTimeRemaining: number
}

export interface LoadingPhaseUpdate {
  phase: string
  progress: number
  message: string
  estimatedTimeRemaining?: number
}
