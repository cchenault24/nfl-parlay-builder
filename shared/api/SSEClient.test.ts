import { beforeEach, describe, expect, it, vi } from 'vitest'

// Every generation the user pays for arrives through this parser, and it is
// hand-written, so the cases that matter are the ones a network actually
// produces: a frame split across chunks, a frame that arrives in pieces too
// small to contain a delimiter, and a close that is really a user's cancel.

const streamingFetch = vi.fn()
vi.mock('../runtime', () => ({
  sharedRuntime: () => ({ streamingFetch }),
}))

const { SSEClient } = await import('./SSEClient')

type Evt = { type: string; data: unknown }

// A body that yields exactly the chunks given, so a test can choose where the
// boundaries fall.
function bodyOf(chunks: string[]) {
  const encoder = new TextEncoder()
  let i = 0
  return {
    getReader: () => ({
      read: async () =>
        i < chunks.length
          ? { done: false, value: encoder.encode(chunks[i++]) }
          : { done: true, value: undefined },
    }),
  }
}

function respond(chunks: string[], init: { ok?: boolean; status?: number } = {}) {
  streamingFetch.mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    body: bodyOf(chunks),
  })
}

// The stream is driven on a floating promise, so a test has to let the
// microtask queue drain before asserting.
const drain = () => new Promise(resolve => setTimeout(resolve, 0))

function run(chunks: string[], init?: { ok?: boolean; status?: number }) {
  respond(chunks, init)
  const events: Evt[] = []
  const closes: (string | undefined)[] = []
  const stop = new SSEClient<Evt>().start({
    url: 'https://api.test/stream',
    onEvent: e => events.push(e),
    onClose: reason => closes.push(reason),
  })
  return { events, closes, stop }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SSEClient framing', () => {
  it('parses a single frame', async () => {
    const { events, closes } = run(['event: step\ndata: {"id":"a"}\n\n'])
    await drain()

    expect(events).toEqual([{ type: 'step', data: { id: 'a' } }])
    expect(closes).toEqual(['eof'])
  })

  it('parses several frames in one chunk', async () => {
    const { events } = run([
      'event: step\ndata: {"id":"a"}\n\nevent: step\ndata: {"id":"b"}\n\n',
    ])
    await drain()

    expect(events.map(e => e.data)).toEqual([{ id: 'a' }, { id: 'b' }])
  })

  // The highest-risk behaviour in the file: a chunk boundary lands mid-frame,
  // which is what a real network does and what a naive parser drops.
  it('reassembles a frame split across two chunks', async () => {
    const { events, closes } = run(['event: step\ndata: {"id"', ':"a"}\n\n'])
    await drain()

    expect(events).toEqual([{ type: 'step', data: { id: 'a' } }])
    expect(closes).toEqual(['eof'])
  })

  it('reassembles a frame split across many one-byte chunks', async () => {
    const { events } = run('event: final\ndata: {"ok":true}\n\n'.split(''))
    await drain()

    expect(events).toEqual([{ type: 'final', data: { ok: true } }])
  })

  it('reassembles when the blank-line delimiter itself is split', async () => {
    const { events } = run(['event: step\ndata: {"id":"a"}\n', '\n'])
    await drain()

    expect(events).toEqual([{ type: 'step', data: { id: 'a' } }])
  })

  it('accumulates a multi-line data payload', async () => {
    const { events } = run(['event: step\ndata: {"id":\ndata: "a"}\n\n'])
    await drain()

    expect(events).toEqual([{ type: 'step', data: { id: 'a' } }])
  })

  it('ignores a trailing partial frame that never completes', async () => {
    const { events, closes } = run([
      'event: step\ndata: {"id":"a"}\n\nevent: step\ndata: {"id"',
    ])
    await drain()

    expect(events).toHaveLength(1)
    expect(closes).toEqual(['eof'])
  })

  it('skips a frame with an event but no data', async () => {
    const { events, closes } = run(['event: ping\n\nevent: step\ndata: {"id":"a"}\n\n'])
    await drain()

    expect(events).toEqual([{ type: 'step', data: { id: 'a' } }])
    expect(closes).toEqual(['eof'])
  })
})

describe('SSEClient close reasons', () => {
  it('reports eof when the body ends cleanly', async () => {
    const { closes } = run(['event: step\ndata: {}\n\n'])
    await drain()

    expect(closes).toEqual(['eof'])
  })

  it('reports the status when the response is not ok', async () => {
    const { closes, events } = run([], { ok: false, status: 503 })
    await drain()

    expect(closes).toEqual(['bad_status_503'])
    expect(events).toEqual([])
  })

  it('reports bad_status when there is no body at all', async () => {
    streamingFetch.mockResolvedValue({ ok: true, status: 200, body: null })
    const closes: (string | undefined)[] = []
    new SSEClient<Evt>().start({
      url: 'https://api.test/stream',
      onEvent: () => {},
      onClose: reason => closes.push(reason),
    })
    await drain()

    expect(closes).toEqual(['bad_status_200'])
  })

  // Closing rather than skipping is deliberate: a frame we cannot read means
  // the stream is no longer trustworthy, and silently dropping it would leave
  // the run looking like it simply never finished.
  it('closes the stream on unparseable JSON instead of skipping the frame', async () => {
    const { events, closes } = run([
      'event: step\ndata: {not json}\n\nevent: step\ndata: {"id":"b"}\n\n',
    ])
    await drain()

    expect(events).toEqual([])
    expect(closes).toEqual(['bad_json'])
  })

  it('reports a transport failure', async () => {
    streamingFetch.mockRejectedValue(new Error('network unreachable'))
    const closes: (string | undefined)[] = []
    new SSEClient<Evt>().start({
      url: 'https://api.test/stream',
      onEvent: () => {},
      onClose: reason => closes.push(reason),
    })
    await drain()

    expect(closes).toEqual(['network unreachable'])
  })

  // A user's own cancel must not surface as a network error. The abort makes
  // fetch throw, and the signal is the only thing that distinguishes the two.
  it('stays silent when the failure is the caller aborting', async () => {
    let abortSignal: AbortSignal | undefined
    streamingFetch.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          abortSignal = init.signal
          init.signal.addEventListener('abort', () =>
            reject(new Error('The operation was aborted'))
          )
        })
    )
    const closes: (string | undefined)[] = []
    const stop = new SSEClient<Evt>().start({
      url: 'https://api.test/stream',
      onEvent: () => {},
      onClose: reason => closes.push(reason),
    })

    stop()
    await drain()

    expect(abortSignal?.aborted).toBe(true)
    expect(closes).toEqual([])
  })
})

describe('SSEClient request', () => {
  it('passes the caller’s headers and an abort signal through', async () => {
    respond(['event: step\ndata: {}\n\n'])
    new SSEClient<Evt>().start({
      url: 'https://api.test/stream',
      headers: { Authorization: 'Bearer token-1' },
      onEvent: () => {},
    })
    await drain()

    expect(streamingFetch).toHaveBeenCalledWith(
      'https://api.test/stream',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-1' },
        signal: expect.any(AbortSignal),
      })
    )
  })

  it('tolerates a caller that supplied no onClose', async () => {
    respond(['event: step\ndata: {}\n\n'])
    const events: Evt[] = []
    new SSEClient<Evt>().start({
      url: 'https://api.test/stream',
      onEvent: e => events.push(e),
    })
    await drain()

    expect(events).toHaveLength(1)
  })
})
