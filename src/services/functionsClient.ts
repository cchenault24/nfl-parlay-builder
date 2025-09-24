import {
  GenerateParlayResponse,
  ParlayOptions,
  UnifiedGameData,
} from '@npb/shared'
import { RUNTIME } from '../config/runtime'

const base = () => RUNTIME.functionsBaseUrl

export const FunctionsAPI = {
  async generateParlay(gameId: string, options?: ParlayOptions) {
    const url = `${base()}/generateParlay`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ gameId, options }),
    })
    if (!res.ok) throw new Error(`generateParlay failed: ${res.status}`)
    return (await res.json()) as GenerateParlayResponse
  },

  // Example proxy endpoints you’ll add later (stubs for now)
  async gameDetails(gameId: string) {
    const url = `${base()}/gameDetails?gameId=${encodeURIComponent(gameId)}`
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`gameDetails failed: ${res.status}`)
    return (await res.json()) as UnifiedGameData
  },
}
