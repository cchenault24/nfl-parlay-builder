export type HttpOptions = {
  timeoutMs?: number
  headers?: Record<string, string>
}

export async function http<T>(
  path: string,
  init: RequestInit = {},
  opts: HttpOptions = {}
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000)
  try {
    const res = await fetch(path, {
      ...init,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...(init.headers ?? {}),
        ...(opts.headers ?? {}),
      },
      signal: controller.signal,
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status} ${res.statusText} ${body}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}
