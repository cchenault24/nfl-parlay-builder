import { API_CONFIG } from '../config/api'
import type {
  AgentResult,
  AgentStep,
  RateLimitInfo,
  RiskLevel,
  RunError,
  RunStatus,
} from '../types'
import { SSEClient } from './SSEClient'

export interface AgentRunRecord {
  id: string
  status: RunStatus
  result?: AgentResult
  error?: RunError
}

export type RunStreamEvent =
  | { type: 'step'; data: AgentStep }
  | { type: 'status'; data: { status: RunStatus } }
  | { type: 'final'; data: AgentResult }
  | { type: 'error'; data: RunError }

export class AgentRunService {
  private base(): string {
    return API_CONFIG.CLOUD_FUNCTIONS.baseURL
  }

  private async request<T>(
    path: string,
    token: string,
    init: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${this.base()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        message?: string
      } | null
      if (res.status === 429) {
        throw new Error(
          'Rate limit exceeded. You have used all your parlay generations for this hour.'
        )
      }
      if (res.status === 401) {
        throw new Error('Authentication failed. Please sign in again.')
      }
      throw new Error(body?.message ?? `Request failed (${res.status})`)
    }
    return res.json() as Promise<T>
  }

  getRateLimitStatus(token: string): Promise<RateLimitInfo> {
    return this.request('/agent/rate-limit', token)
  }

  createRun(params: {
    gameId: string
    riskLevel: RiskLevel
    token: string
  }): Promise<{ runId: string; rateLimitInfo: RateLimitInfo }> {
    return this.request('/agent/runs', params.token, {
      method: 'POST',
      body: JSON.stringify({
        gameId: params.gameId,
        riskLevel: params.riskLevel,
      }),
    })
  }

  getRun(runId: string, token: string): Promise<AgentRunRecord> {
    return this.request(`/agent/runs/${runId}`, token)
  }

  cancelRun(runId: string, token: string): Promise<{ ok: boolean }> {
    return this.request(`/agent/runs/${runId}/cancel`, token, {
      method: 'POST',
    })
  }

  streamRun(
    runId: string,
    token: string,
    onEvent: (evt: RunStreamEvent) => void,
    onClose: (reason?: string) => void
  ): () => void {
    return new SSEClient<RunStreamEvent>().start({
      url: `${this.base()}/agent/runs/${runId}/stream`,
      headers: { Authorization: `Bearer ${token}` },
      onEvent,
      onClose,
    })
  }
}
