import { log } from './logger'

export type SpanContext = {
  traceId: string
  spanId: string
  parentSpanId?: string
}

export type Span = {
  name: string
  ctx: SpanContext
  start: number
  attrs?: Record<string, string | number | boolean>
}

function randomId(): string {
  return (
    Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2)
  )
}

export function startSpan(
  name: string,
  opts?: {
    parent?: SpanContext
    attrs?: Record<string, string | number | boolean>
    correlationId?: string
    runId?: string
  }
): Span {
  const ctx: SpanContext = {
    traceId: opts?.parent?.traceId || randomId(),
    spanId: randomId(),
    parentSpanId: opts?.parent?.spanId,
  }
  const span: Span = { name, ctx, start: Date.now(), attrs: opts?.attrs }
  log.debug('trace.span.start', {
    correlationId: opts?.correlationId,
    runId: opts?.runId,
    span: { name, ...ctx },
    attrs: opts?.attrs,
  })
  return span
}

export function endSpan(
  span: Span,
  opts?: {
    correlationId?: string
    runId?: string
    status?: 'ok' | 'error'
    errorMessage?: string
  }
): void {
  const durationMs = Date.now() - span.start
  log.debug('trace.span.end', {
    correlationId: opts?.correlationId,
    runId: opts?.runId,
    span: { name: span.name, ...span.ctx },
    ms: durationMs,
    status: opts?.status || 'ok',
    error: opts?.errorMessage
      ? { code: 'span_error', message: opts.errorMessage }
      : undefined,
  })
}
