import { useEffect, useMemo, useRef } from 'react'
import { useAgentRun } from '../../hooks/useAgentRun'

type Props = {
  gameId: string
}

export function AgentRunTimeline({ gameId }: Props) {
  const { runId, status, steps, finalData, error, start, clear } = useAgentRun()
  const containerRef = useRef<HTMLDivElement | null>(null)

  // ARIA live for updates
  useEffect(() => {
    const el = containerRef.current
    if (!el) {
      return
    }
    el.setAttribute('aria-live', 'polite')
  }, [])

  const ordered = useMemo(
    () => steps.slice().sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
    [steps]
  )

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => start({ gameId, numLegs: 3, riskLevel: 'moderate' })}
          disabled={status === 'running'}
        >
          {status === 'running' ? 'Running…' : 'Start Agentic Run'}
        </button>
        <button onClick={clear}>Clear</button>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Run: {runId || '—'} | Status: {status}
        </div>
      </div>

      <div
        style={{
          maxHeight: 240,
          overflow: 'auto',
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: 8,
        }}
      >
        {ordered.map(s => (
          <div
            key={s.id}
            style={{ padding: '4px 0', borderBottom: '1px dashed #eee' }}
          >
            <div style={{ fontWeight: 600 }}>{s.type}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {s.startedAt} → {s.finishedAt || '…'}
            </div>
            {s.notes && <div style={{ fontSize: 12 }}>{s.notes}</div>}
          </div>
        ))}
        {ordered.length === 0 && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>No steps yet</div>
        )}
      </div>

      {finalData && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 700 }}>Final Parlay</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {JSON.stringify(finalData, null, 2)}
          </pre>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 8, color: '#b00020' }}>
          <div style={{ fontWeight: 700 }}>Error</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
