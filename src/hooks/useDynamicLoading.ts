import { useEffect, useMemo, useRef, useState } from 'react'
import { LoadingProgress } from '../types/loading'
import { getPhasesForMode, getTotalEstimatedTime } from '../utils/loadingPhases'

interface UseDynamicLoadingProps {
  isMockMode: boolean
  isActive: boolean
  onPhaseUpdate?: (progress: LoadingProgress) => void
  onComplete?: () => void
}

export const useDynamicLoading = ({
  isMockMode,
  isActive,
  onPhaseUpdate,
  onComplete,
}: UseDynamicLoadingProps) => {
  const [currentPhase, setCurrentPhase] = useState<string>('')
  const [phaseProgress, setPhaseProgress] = useState(0)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [overtimeSeconds, setOvertimeSeconds] = useState(0)

  const phases = useMemo(() => getPhasesForMode(isMockMode), [isMockMode])
  const totalEstimatedTime = useMemo(
    () => getTotalEstimatedTime(isMockMode),
    [isMockMode]
  )
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const phaseStartTimeRef = useRef<number | null>(null)
  const currentPhaseIndexRef = useRef<number>(0)
  const isCompletedRef = useRef<boolean>(false)

  // Calculate overall progress
  const overallProgress =
    phases.reduce((total, _, index) => {
      if (index < currentPhaseIndex) {
        return total + 100
      } else if (index === currentPhaseIndex) {
        return total + phaseProgress
      }
      return total
    }, 0) / phases.length

  // Calculate estimated time remaining and handle overtime
  const elapsedTime = startTimeRef.current
    ? Date.now() - startTimeRef.current
    : 0
  const isOvertime = elapsedTime > totalEstimatedTime
  const estimatedTimeRemaining = isOvertime
    ? 0
    : Math.max(0, totalEstimatedTime - elapsedTime)

  // Get current phase data
  const currentPhaseData = phases[currentPhaseIndex]

  // Function to complete loading when API finishes
  const completeLoading = () => {
    if (isCompletedRef.current) return
    isCompletedRef.current = true

    // Clear the interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Set to final phase and 100% progress
    setCurrentPhaseIndex(phases.length - 1)
    setCurrentPhase(phases[phases.length - 1].id)
    setPhaseProgress(100)

    // Call completion callback
    if (onComplete) {
      onComplete()
    }
  }

  // Expose completeLoading function
  const completeLoadingRef = useRef(completeLoading)
  completeLoadingRef.current = completeLoading

  // Start loading process
  useEffect(() => {
    if (isActive && phases.length > 0) {
      const now = Date.now()
      startTimeRef.current = now
      phaseStartTimeRef.current = now
      currentPhaseIndexRef.current = 0
      isCompletedRef.current = false

      setCurrentPhaseIndex(0)
      setCurrentPhase(phases[0].id)
      setPhaseProgress(0)
      setOvertimeSeconds(0)

      // Start the timer
      intervalRef.current = setInterval(() => {
        // Check if loading was completed externally
        if (isCompletedRef.current) {
          return
        }

        const now = Date.now()
        const elapsed = startTimeRef.current ? now - startTimeRef.current : 0

        // Calculate overtime if we've exceeded the estimated time
        if (elapsed > totalEstimatedTime) {
          const overtime = Math.floor((elapsed - totalEstimatedTime) / 1000)
          setOvertimeSeconds(overtime)
        }

        // Calculate phase progress using refs to avoid stale closures
        const currentPhaseDuration =
          phases[currentPhaseIndexRef.current]?.duration || 0
        const phaseElapsed = phaseStartTimeRef.current
          ? now - phaseStartTimeRef.current
          : 0
        const progress = Math.min(
          95,
          (phaseElapsed / currentPhaseDuration) * 100
        ) // Cap at 95% to leave room for completion
        setPhaseProgress(progress)

        // Check if we should move to next phase (but don't auto-complete the last phase)
        if (
          phaseElapsed >= currentPhaseDuration &&
          currentPhaseIndexRef.current < phases.length - 1
        ) {
          const nextIndex = currentPhaseIndexRef.current + 1
          currentPhaseIndexRef.current = nextIndex
          phaseStartTimeRef.current = now

          setCurrentPhaseIndex(nextIndex)
          setCurrentPhase(phases[nextIndex].id)
          setPhaseProgress(0)
        }
      }, 100) // Update every 100ms for smooth progress
    } else if (!isActive) {
      // Reset when not active
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setCurrentPhase('')
      setPhaseProgress(0)
      setCurrentPhaseIndex(0)
      setOvertimeSeconds(0)
      currentPhaseIndexRef.current = 0
      phaseStartTimeRef.current = null
      isCompletedRef.current = false
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive, phases])

  // Notify parent of progress updates
  useEffect(() => {
    if (isActive && onPhaseUpdate) {
      const progress: LoadingProgress = {
        currentPhase,
        phaseProgress,
        overallProgress,
        estimatedTimeRemaining,
        isMockMode,
      }
      onPhaseUpdate(progress)
    }
  }, [
    isActive,
    currentPhase,
    phaseProgress,
    overallProgress,
    estimatedTimeRemaining,
    isMockMode,
    onPhaseUpdate,
  ])

  // Return the completeLoading function so it can be called externally
  return {
    currentPhase,
    phaseProgress,
    overallProgress,
    estimatedTimeRemaining,
    currentPhaseData,
    phases,
    totalEstimatedTime,
    isOvertime,
    overtimeSeconds,
    completeLoading: completeLoadingRef.current,
  }
}
