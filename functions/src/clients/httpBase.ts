import fetch, { RequestInit } from 'node-fetch'

export class HttpBase {
  constructor(
    private readonly baseUrl: string,
    private readonly headers: Record<string, string> = {}
  ) {}

  async get<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      method: 'GET',
      headers: { ...this.headers, ...(init?.headers || {}) },
      // add timeouts if you wrap fetch
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(
        `GET ${path} failed ${res.status} ${res.statusText} ${body}`
      )
    }
    return res.json() as Promise<T>
  }
}
