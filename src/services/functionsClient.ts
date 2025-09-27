import { RUNTIME } from '../config/runtime'
import { GenerateParlayResponse, ParlayOptions } from '../shared'

const base = () => {
  if (!RUNTIME.functionsBaseUrl) {
    throw new Error('functionsBaseUrl is not configured')
  }
  return RUNTIME.functionsBaseUrl
}

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
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`generateParlay failed: ${res.status} ${text}`)
    }
    return (await res.json()) as GenerateParlayResponse
  },
}
