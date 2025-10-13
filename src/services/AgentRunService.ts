import { API_CONFIG } from '../config/api'
import { SSEClient } from './SSEClient'

export type AgentRun = {
  id: string
  status: 'queued' | 'running' | 'succeeded' | 'canceled' | 'failed'
  result?: {
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
  error?: {
    code: string
    message: string
    details?:
      | string
      | number
      | boolean
      | null
      | string[]
      | { [k: string]: string | number | boolean | null | string[] }
  }
}

export class AgentRunService {
  private sse = new SSEClient<
    {
      id: string
      type: string
      startedAt: string
      finishedAt?: string
      notes?: string
    },
    AgentRun['result'],
    { code: string; message?: string; raw?: string }
  >()

  private base(): string {
    return `${API_CONFIG.CLOUD_FUNCTIONS.baseURL}/api`
  }

  async createRun(params: {
    gameId: string
    gameContext?: {
      gameId: string
      week: number
      dateTime: string
      status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
      home: {
        teamId: string
        name: string
        abbrev: string
        record: string
        overallRecord: string
        homeRecord: string
        roadRecord: string
      }
      away: {
        teamId: string
        name: string
        abbrev: string
        record: string
        overallRecord: string
        homeRecord: string
        roadRecord: string
      }
      venue: {
        name: string
        city: string
        state: string
      }
    }
    numLegs: number
    riskLevel: 'conservative' | 'moderate' | 'aggressive'
    authToken?: string
    emulatorUid?: string
  }): Promise<{ runId: string }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (params.authToken) {
      headers['Authorization'] = `Bearer ${params.authToken}`
    }
    if (params.emulatorUid) {
      headers['X-Emulator-Auth-UID'] = params.emulatorUid
    }
    const res = await fetch(`${this.base()}/agent/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        gameId: params.gameId,
        gameContext: params.gameContext, // Rich game context
        numLegs: params.numLegs,
        riskLevel: params.riskLevel,
      }),
    })
    if (!res.ok) {
      throw new Error(`createRun failed: ${res.status}`)
    }
    return res.json()
  }

  async getRun(
    runId: string,
    auth?: { token?: string; emulatorUid?: string }
  ): Promise<AgentRun> {
    const headers: Record<string, string> = {}
    if (auth?.token) {
      headers['Authorization'] = `Bearer ${auth.token}`
    }
    if (auth?.emulatorUid) {
      headers['X-Emulator-Auth-UID'] = auth.emulatorUid
    }
    const res = await fetch(`${this.base()}/agent/runs/${runId}`, { headers })
    if (!res.ok) {
      throw new Error(`getRun failed: ${res.status}`)
    }
    return res.json()
  }

  streamRun(
    runId: string,
    auth: { token?: string; emulatorUid?: string },
    onEvent: (
      evt:
        | {
            type: 'step'
            data: {
              id: string
              type: string
              startedAt: string
              finishedAt?: string
              notes?: string
            }
          }
        | { type: 'final'; data: AgentRun['result'] }
        | {
            type: 'error'
            data: { code: string; message?: string; raw?: string }
          }
    ) => void
  ): () => void {
    const headers: Record<string, string> = {}
    if (auth?.token) {
      headers['Authorization'] = `Bearer ${auth.token}`
    }
    if (auth?.emulatorUid) {
      headers['X-Emulator-Auth-UID'] = auth.emulatorUid
    }
    return this.sse.start({
      url: `${this.base()}/agent/runs/${runId}/stream`,
      headers,
      onEvent,
    })
  }
}
