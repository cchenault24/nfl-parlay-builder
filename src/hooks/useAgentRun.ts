import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AgentRunService } from '../services/AgentRunService'
import { useAuth } from './useAuth'

type StepEvent = {
  id: string
  type: string
  startedAt: string
  finishedAt?: string
  notes?: string
}

export function useAgentRun() {
  const { user } = useAuth()
  const serviceRef = useRef<AgentRunService>()
  if (!serviceRef.current) {
    serviceRef.current = new AgentRunService()
  }
  const svc = serviceRef.current

  type FinalResult = {
    legs: Array<{
      betType: string
      selection: string
      odds: number
      confidence: number
      reasoning: string
      team: string
    }>
    analysisSummary: {
      matchupSummary: string
      keyFactors: string[]
      gamePrediction: {
        winner: string
        projectedScore: { home: number; away: number }
        winProbability: number
      }
    }
  }

  const [runId, setRunId] = useState<string | null>(() =>
    localStorage.getItem('agentRunId')
  )
  type RunStatus =
    | 'idle'
    | 'queued'
    | 'running'
    | 'succeeded'
    | 'canceled'
    | 'failed'
  const [status, setStatus] = useState<RunStatus>('idle')
  const [steps, setSteps] = useState<StepEvent[]>([])
  const lastStepIdRef = useRef<string | null>(null)
  const seenStepIdsRef = useRef<Set<string>>(new Set())
  const statusRef = useRef<RunStatus>('idle')
  const finalDataRef = useRef<FinalResult | null>(null)
  const [finalData, setFinalData] = useState<FinalResult | null>(null)

  // Keep refs in sync with state
  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    finalDataRef.current = finalData
  }, [finalData])

  const [error, setError] = useState<{ code: string; message: string } | null>(
    null
  )

  const authHeaders = useMemo(() => {
    return {
      token: undefined as string | undefined,
      emulatorUid:
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1')
          ? 'test-user'
          : undefined,
    }
  }, [user])

  const start = useCallback(
    async (params: {
      gameId: string
      numLegs: number
      riskLevel: 'conservative' | 'moderate' | 'aggressive'
    }) => {
      setError(null)
      setSteps([])
      setFinalData(null)
      setStatus('queued')
      const res = await svc.createRun({
        ...params,
        authToken: authHeaders.token,
        emulatorUid: authHeaders.emulatorUid,
      })
      setRunId(res.runId)
      localStorage.setItem('agentRunId', res.runId)
    },
    [svc, authHeaders]
  )

  // attach SSE / fallback to polling
  useEffect(() => {
    if (!runId) {
      return
    }
    setStatus('running')

    let closed = false
    let cancelSse: (() => void) | null = null

    const attachSSE = () => {
      cancelSse = svc.streamRun(runId, authHeaders, evt => {
        if (evt.type === 'step') {
          const incoming = evt.data as StepEvent
          if (
            lastStepIdRef.current === incoming.id ||
            seenStepIdsRef.current.has(incoming.id)
          ) {
            return
          }
          lastStepIdRef.current = incoming.id
          seenStepIdsRef.current.add(incoming.id)
          setSteps(prev =>
            prev.length && prev[prev.length - 1].id === incoming.id
              ? prev
              : [...prev, incoming]
          )
        } else if (evt.type === 'final') {
          setFinalData(evt.data as FinalResult)
          setStatus('succeeded')
        } else if (evt.type === 'error') {
          setError({
            code: evt.data.code,
            message: evt.data.message ?? 'error',
          })
          setStatus('failed')
        }
      })
    }

    // initial attach
    attachSSE()

    // background polling with jittered backoff as a safety net
    let backoff = 500
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    const pollOnce = async () => {
      if (closed) {
        return
      }
      try {
        const r = await svc.getRun(runId, authHeaders)
        setStatus(r.status as RunStatus)
        if (r.status === 'succeeded') {
          const result = r.result
          setFinalData(result ? (result as FinalResult) : null)
          // Stop polling when run completes successfully
          if (pollTimer) {
            clearTimeout(pollTimer)
            pollTimer = null
          }
        } else if (r.status === 'failed' || r.status === 'canceled') {
          const err = r.error
          if (err && typeof err.message === 'string') {
            setError({ code: err.code, message: err.message })
          } else if (err) {
            setError({ code: err.code, message: 'error' })
          }
          // Stop polling when run fails or is canceled
          if (pollTimer) {
            clearTimeout(pollTimer)
            pollTimer = null
          }
        }
      } catch {
        void 0
      }

      // Only schedule next poll if we haven't completed and aren't closed
      if (
        !closed &&
        statusRef.current !== 'succeeded' &&
        statusRef.current !== 'failed' &&
        statusRef.current !== 'canceled'
      ) {
        backoff = Math.min(backoff * 2 + Math.random() * 200, 5000)
        pollTimer = setTimeout(pollOnce, backoff)
      }
    }
    // Start initial polling
    pollTimer = setTimeout(pollOnce, backoff)

    return () => {
      closed = true
      try {
        cancelSse?.()
      } catch {
        void 0
      }
      if (pollTimer) {
        clearTimeout(pollTimer)
      }
      // Health check removed
    }
  }, [runId, svc, authHeaders]) // Note: status and finalData are intentionally not in deps to avoid recreating health check

  const clear = useCallback(() => {
    setRunId(null)
    localStorage.removeItem('agentRunId')
    setStatus('idle')
    setSteps([])
    setFinalData(null)
    setError(null)
  }, [])

  return { runId, status, steps, finalData, error, start, clear }
}
