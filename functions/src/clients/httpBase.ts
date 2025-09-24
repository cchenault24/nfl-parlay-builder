import { TimeoutError, UpstreamError } from '../util/errors'

type RetryOpts = { retries: number; minDelayMs: number; maxDelayMs: number }

export type HttpBaseInit = {
  baseUrl: string
  headers?: Record<string, string>
  defaultTimeoutMs?: number
  retry?: RetryOpts
}

export class HttpBase {
  private baseUrl: string
  private headers: Record<string, string>
  private defaultTimeoutMs: number
  private retry: RetryOpts

  constructor(cfg: HttpBaseInit) {
    this.baseUrl = cfg.baseUrl.replace(/\/+$/, '')
    this.headers = cfg.headers ?? {}
    this.defaultTimeoutMs = cfg.defaultTimeoutMs ?? 8000
    this.retry = cfg.retry ?? { retries: 3, minDelayMs: 250, maxDelayMs: 1500 }
  }

  async get<T>(
    path: string,
    init?: RequestInit & { timeoutMs?: number }
  ): Promise<T> {
    return this.request<T>('GET', path, undefined, init)
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    init?: RequestInit & { timeoutMs?: number }
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    let attempt = 0
    const total = Math.max(1, this.retry.retries)

    while (attempt < total) {
      attempt++
      const controller = new AbortController()
      const timeout = setTimeout(
        () => controller.abort(),
        init?.timeoutMs ?? this.defaultTimeoutMs
      )

      try {
        const res = await fetch(url, {
          method,
          headers: {
            accept: 'application/json',
            ...(body ? { 'content-type': 'application/json' } : {}),
            ...this.headers,
            ...(init?.headers ?? {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
          ...init,
        })
        clearTimeout(timeout)

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          if (res.status === 429 || res.status >= 500) {
            if (attempt < total) {
              await backoff(
                attempt,
                this.retry.minDelayMs,
                this.retry.maxDelayMs
              )
              continue
            }
          }
          throw new UpstreamError(`HTTP ${res.status} ${res.statusText}`, {
            url,
            status: res.status,
            body: text,
          })
        }

        const ct = res.headers.get('content-type') || ''
        if (ct.includes('application/json')) return (await res.json()) as T
        return (await res.text()) as unknown as T
      } catch (err: any) {
        clearTimeout(timeout)
        if (err?.name === 'AbortError') {
          if (attempt < total) {
            await backoff(attempt, this.retry.minDelayMs, this.retry.maxDelayMs)
            continue
          }
          throw new TimeoutError(`Timeout calling ${url}`)
        }
        if (attempt < total && isTransient(err)) {
          await backoff(attempt, this.retry.minDelayMs, this.retry.maxDelayMs)
          continue
        }
        throw err
      }
    }
    throw new Error(`Request failed after ${total} attempts: ${url}`)
  }
}

function isTransient(err: any) {
  const msg = String(err?.message ?? '')
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|fetch failed/i.test(
    msg
  )
}
async function backoff(attempt: number, base: number, cap: number) {
  const jitter = Math.random() + 0.5
  const delay = Math.min(cap, base * Math.pow(2, attempt - 1)) * jitter
  await new Promise(r => setTimeout(r, delay))
}
