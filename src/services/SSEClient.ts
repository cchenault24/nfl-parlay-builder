export type SSEOptions<
  TStep,
  TFinal,
  TErr extends { code: string; message?: string; raw?: string },
> = {
  url: string
  headers?: Record<string, string>
  onEvent: (
    evt:
      | { type: 'step'; data: TStep }
      | { type: 'final'; data: TFinal }
      | { type: 'error'; data: TErr }
  ) => void
  onOpen?: () => void
  onClose?: (reason?: string) => void
}

export class SSEClient<
  TStep,
  TFinal,
  TErr extends { code: string; message?: string; raw?: string },
> {
  private controller: AbortController | null = null

  start(opts: SSEOptions<TStep, TFinal, TErr>): () => void {
    const { url, headers = {}, onEvent, onOpen, onClose } = opts
    this.controller = new AbortController()
    const signal = this.controller.signal

    ;(async () => {
      try {
        const res = await fetch(url, { headers, signal })
        if (!res.ok || !res.body) {
          onClose?.(`bad_status_${res.status}`)
          return
        }
        onOpen?.()
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          buffer += dec.decode(value, { stream: true })
          let idx
          // Parse SSE frames separated by double newlines
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, idx)
            buffer = buffer.slice(idx + 2)
            const lines = frame.split('\n')
            let eventType: 'step' | 'final' | 'error' | null = null
            let dataLine = ''
            for (const l of lines) {
              if (l.startsWith('event:')) {
                eventType = l.slice(6).trim() as 'step' | 'final' | 'error'
              }
              if (l.startsWith('data:')) {
                dataLine += l.slice(5).trim()
              }
            }
            if (eventType && dataLine) {
              try {
                const parsed = JSON.parse(dataLine) as TStep & TFinal & TErr
                if (eventType === 'step') {
                  onEvent({ type: 'step', data: parsed as TStep })
                } else if (eventType === 'final') {
                  onEvent({ type: 'final', data: parsed as TFinal })
                } else {
                  onEvent({ type: 'error', data: parsed as TErr })
                }
              } catch {
                onEvent({
                  type: 'error',
                  data: { code: 'bad_json', raw: dataLine } as TErr,
                })
              }
            }
          }
        }
        onClose?.('eof')
      } catch (e) {
        if (signal.aborted) {
          return
        }
        const msg = e instanceof Error ? e.message : String(e)
        onClose?.(msg)
      }
    })()

    return () => {
      try {
        this.controller?.abort()
      } catch {
        // ignore
      }
      this.controller = null
    }
  }
}
