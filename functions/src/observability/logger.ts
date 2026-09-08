type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogFields = {
  correlationId?: string
  runId?: string
  userId?: string
  stepId?: string
  stepType?: string
  tool?: string
  ms?: number
  tokensIn?: number
  tokensOut?: number
  success?: boolean
  error?: { code: string; message: string }
  // Additional arbitrary structured fields
  [key: string]: unknown
}

function truncate(value: string, max = 512): string {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    // rudimentary secret redaction
    if (/sk-\w+/i.test(value)) {
      return '[redacted]'
    }
    return truncate(value)
  }
  if (Array.isArray(value)) {
    return value.map(v => redact(v))
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/password|secret|token|apiKey/i.test(k)) {
        out[k] = '[redacted]'
      } else {
        out[k] = redact(v)
      }
    }
    return out
  }
  return value
}

function base(level: LogLevel, msg: string, fields: LogFields = {}): void {
  const redacted = redact(fields) as Record<string, unknown>
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...redacted,
  }
  console.info(JSON.stringify(entry))
}

export const log = {
  debug: (msg: string, fields?: LogFields) => base('debug', msg, fields),
  info: (msg: string, fields?: LogFields) => base('info', msg, fields),
  warn: (msg: string, fields?: LogFields) => base('warn', msg, fields),
  error: (msg: string, fields?: LogFields) => base('error', msg, fields),
}

export function timeIt<T>(
  fn: () => Promise<T>
): Promise<{ ms: number; result: T }> {
  const start = Date.now()
  return fn().then(result => ({ ms: Date.now() - start, result }))
}
