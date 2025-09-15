import {
  APIConfig,
  APIRequestConfig,
  APIRequestData,
  APIResponse,
  HTTPError,
  IAPIClient,
} from './types'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export default class APIClient implements IAPIClient {
  private readonly baseURL: string
  private readonly defaultHeaders: Record<string, string>
  private readonly timeoutMs: number
  private readonly retries: number
  private readonly retryDelayMs: number

  constructor(config: APIConfig) {
    if (!config.baseURL) {
      throw new Error('APIClient requires baseURL')
    }
    this.baseURL = stripTrailingSlash(config.baseURL)
    this.defaultHeaders = {
      Accept: 'application/json',
      ...(config.headers ?? {}),
    }
    this.timeoutMs = config.timeoutMs ?? 15000
    this.retries = clamp(config.retries ?? 0, 0, 5)
    this.retryDelayMs = config.retryDelayMs ?? 300
  }

  get<T>(endpoint: string, config?: APIRequestConfig): Promise<APIResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, config)
  }
  post<T>(
    endpoint: string,
    data?: APIRequestData,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>> {
    return this.request<T>('POST', endpoint, data, config)
  }
  put<T>(
    endpoint: string,
    data?: APIRequestData,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>> {
    return this.request<T>('PUT', endpoint, data, config)
  }
  patch<T>(
    endpoint: string,
    data?: APIRequestData,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, config)
  }
  delete<T>(
    endpoint: string,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, config)
  }

  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    data?: APIRequestData,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>> {
    const url = this.buildURL(endpoint, config?.params)
    const headers = { ...this.defaultHeaders, ...(config?.headers ?? {}) }

    const init: RequestInit = { method, headers }

    if (method !== 'GET' && method !== 'DELETE') {
      const bodyAndHeaders = serializeBody(data, headers)
      init.body = bodyAndHeaders.body
      Object.assign(headers, bodyAndHeaders.headers)
    }

    const timeoutMs = config?.timeoutMs ?? this.timeoutMs
    const controller = new AbortController()
    const signals = mergeAbortSignals(controller.signal, config?.signal)
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await this.fetchWithRetries(url, init, signals)
      const resHeaders = headersToObject(res.headers)

      let parsed: unknown = undefined
      const contentType = res.headers.get('Content-Type') || ''

      if (contentType.includes('application/json')) {
        parsed = await safeJson(res)
      } else if (contentType.includes('text/')) {
        parsed = await res.text()
      } else if (
        contentType.includes('application/octet-stream') ||
        contentType.includes('binary')
      ) {
        parsed = new Uint8Array(await res.arrayBuffer())
      } else if (res.status !== 204) {
        // best effort
        parsed = await tryBestEffortBody(res)
      }

      if (!res.ok) {
        throw new HTTPError(
          `HTTP ${res.status} for ${method} ${url}`,
          res.status,
          parsed
        )
      }

      return { data: parsed as T, status: res.status, headers: resHeaders }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async fetchWithRetries(
    url: string,
    init: RequestInit,
    signal?: AbortSignal
  ): Promise<Response> {
    let attempt = 0
    let lastError: unknown

    while (attempt <= this.retries) {
      const attemptInit: RequestInit = { ...init, signal }
      try {
        const res = await fetch(url, attemptInit)
        if (shouldRetryResponse(res)) {
          lastError = new Error(`Retryable status ${res.status}`)
        } else {
          return res
        }
      } catch (err) {
        if (isAbortError(err)) {
          throw err
        }
        lastError = err
      }
      attempt += 1
      if (attempt > this.retries) {
        break
      }
      const delay = backoffWithJitter(this.retryDelayMs, attempt)
      await sleep(delay)
    }

    if (lastError instanceof Error) {
      throw lastError
    }
    throw new Error('Request failed after retries')
  }

  private buildURL(endpoint: string, params?: Record<string, unknown>): string {
    const clean = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseURL}/${ltrim(endpoint, '/')}`
    if (!params || Object.keys(params).length === 0) {
      return clean
    }
    const url = new URL(clean)
    for (const [k, v] of Object.entries(params)) {
      if (v == null) {
        continue
      }
      url.searchParams.set(k, String(v))
    }
    return url.toString()
  }
}

/** helpers */
function stripTrailingSlash(s: string): string {
  return s.endsWith('/') ? s.slice(0, -1) : s
}
function ltrim(s: string, ch: string): string {
  let i = 0
  while (i < s.length && s[i] === ch) {
    i++
  }
  return s.slice(i)
}
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
function headersToObject(h: Headers): Record<string, string> {
  const out: Record<string, string> = {}
  h.forEach((v, k) => {
    out[k.toLowerCase()] = v
  })
  return out
}

function serializeBody(
  data: APIRequestData,
  headers: Record<string, string>
): { body: BodyInit | null | undefined; headers: Record<string, string> } {
  if (data == null) {
    return { body: undefined, headers: {} }
  }
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    const { ['Content-Type']: _1, ['content-type']: _2, ...rest } = headers
    return { body: data, headers: rest }
  }
  if (
    typeof data === 'string' ||
    data instanceof Blob ||
    data instanceof ArrayBuffer ||
    data instanceof Uint8Array
  ) {
    return { body: data as BodyInit, headers: {} }
  }
  return {
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  }
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) {
    return undefined
  }
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function tryBestEffortBody(res: Response): Promise<unknown> {
  try {
    return await safeJson(res)
  } catch {
    try {
      return await res.text()
    } catch {
      try {
        return new Uint8Array(await res.arrayBuffer())
      } catch {
        return undefined
      }
    }
  }
}

function shouldRetryResponse(res: Response): boolean {
  return res.status >= 500 || res.status === 429
}
function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}
function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}
function backoffWithJitter(baseMs: number, attempt: number): number {
  const exp = Math.pow(2, attempt - 1)
  const max = baseMs * exp
  return Math.floor(Math.random() * max)
}

function mergeAbortSignals(
  primary: AbortSignal,
  extra?: AbortSignal
): AbortSignal | undefined {
  if (!extra) {
    return primary
  }
  if (extra.aborted) {
    return extra
  }
  const controller = new AbortController()
  const onAbortPrimary = () => controller.abort(primary.reason)
  const onAbortExtra = () => controller.abort(extra.reason)
  primary.addEventListener('abort', onAbortPrimary, { once: true })
  extra.addEventListener('abort', onAbortExtra, { once: true })
  if (primary.aborted) {
    controller.abort(primary.reason)
  }
  if (extra.aborted) {
    controller.abort(extra.reason)
  }
  return controller.signal
}
