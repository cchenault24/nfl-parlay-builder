import { sharedRuntime } from '../runtime'
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

// The server's own error code, carried through rather than flattened into a
// sentence. A caller that has to *decide* something — a batch that must stop
// rather than fire five more refusals at a rate limit — cannot do it by
// matching on prose.
export interface RunRequestError extends Error {
  code: string
  status: number
}

export function runError(code: string, status: number, message: string): RunRequestError {
  return Object.assign(new Error(message), { code, status })
}

export function runErrorCode(error: unknown): string | undefined {
  return (error as Partial<RunRequestError> | null)?.code
}

export class AgentRunService {
  private async request<T>(
    path: string,
    token: string,
    init: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${sharedRuntime().baseURL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        code?: string
        message?: string
      } | null
      if (res.status === 429) {
        throw runError(
          'rate_limited',
          429,
          'You have used all your parlay generations for now. Try again shortly.'
        )
      }
      if (res.status === 401) {
        throw runError(
          'unauthorized',
          401,
          'Authentication failed. Please sign in again.'
        )
      }
      throw runError(
        body?.code ?? 'request_failed',
        res.status,
        body?.message ?? `Request failed (${res.status})`
      )
    }
    return res.json() as Promise<T>
  }

  getRateLimitStatus(token: string): Promise<RateLimitInfo> {
    return this.request('/agent/rate-limit', token)
  }

  createRun(params: {
    gameIds: string[]
    riskLevel: RiskLevel
    bookmaker?: string
    legCount?: number
    token: string
  }): Promise<{ runId: string; rateLimitInfo: RateLimitInfo }> {
    return this.request('/agent/runs', params.token, {
      method: 'POST',
      body: JSON.stringify({
        gameIds: params.gameIds,
        riskLevel: params.riskLevel,
        // Omitted rather than sent as null: the server rejects a *choice* from
        // a plan that cannot choose, and an unset field is not a choice. The
        // same goes for leg count, whose default belongs to the tier.
        ...(params.bookmaker ? { bookmaker: params.bookmaker } : {}),
        ...(params.legCount !== undefined ? { legCount: params.legCount } : {}),
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
      url: `${sharedRuntime().baseURL}/agent/runs/${runId}/stream`,
      headers: { Authorization: `Bearer ${token}` },
      onEvent,
      onClose,
    })
  }
}
