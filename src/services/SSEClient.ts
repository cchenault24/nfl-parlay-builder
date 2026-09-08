export type SSEOptions<TEvent extends { type: string; data: unknown }> = {
  url: string
  headers?: Record<string, string>
  onEvent: (evt: TEvent) => void
  onClose?: (reason?: string) => void
}

// fetch-based SSE so an Authorization header can be sent (EventSource can't).
export class SSEClient<TEvent extends { type: string; data: unknown }> {
  private controller: AbortController | null = null

  start(opts: SSEOptions<TEvent>): () => void {
    const { url, headers = {}, onEvent, onClose } = opts
    this.controller = new AbortController()
    const { signal } = this.controller

    ;(async () => {
      try {
        const res = await fetch(url, { headers, signal })
        if (!res.ok || !res.body) {
          onClose?.(`bad_status_${res.status}`)
          return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          buffer += decoder.decode(value, { stream: true })
          let idx
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, idx)
            buffer = buffer.slice(idx + 2)
            let type = ''
            let data = ''
            for (const line of frame.split('\n')) {
              if (line.startsWith('event:')) {
                type = line.slice(6).trim()
              } else if (line.startsWith('data:')) {
                data += line.slice(5).trim()
              }
            }
            if (type && data) {
              try {
                onEvent({ type, data: JSON.parse(data) } as TEvent)
              } catch {
                onClose?.('bad_json')
                return
              }
            }
          }
        }
        onClose?.('eof')
      } catch (e) {
        if (!signal.aborted) {
          onClose?.(e instanceof Error ? e.message : String(e))
        }
      }
    })()

    return () => {
      this.controller?.abort()
      this.controller = null
    }
  }
}
