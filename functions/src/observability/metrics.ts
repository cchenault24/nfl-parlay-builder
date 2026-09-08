type CounterMap = Record<string, number>
type HistogramMap = Record<string, number[]>

const counters: CounterMap = {}
const histograms: HistogramMap = {}
let activeRuns = 0

export function inc(name: string, by = 1): void {
  counters[name] = (counters[name] || 0) + by
}

export function observe(name: string, value: number): void {
  if (!histograms[name]) {
    histograms[name] = []
  }
  histograms[name].push(value)
}

export function setActiveRuns(delta: 1 | -1): void {
  activeRuns = Math.max(0, activeRuns + delta)
}

export function snapshot(): {
  counters: CounterMap
  histograms: Record<string, { p50: number; p95: number; count: number }>
  activeRuns: number
  cacheStats: {
    hitRate: number
    missRate: number
    evictionRate: number
  }
} {
  const h: Record<string, { p50: number; p95: number; count: number }> = {}
  for (const [k, arr] of Object.entries(histograms)) {
    const sorted = arr.slice().sort((a, b) => a - b)
    const p = (q: number) =>
      sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] || 0
    h[k] = { p50: p(0.5), p95: p(0.95), count: sorted.length }
  }

  // Calculate cache statistics
  const totalHits =
    (counters['cache_hits_memory'] || 0) +
    (counters['cache_hits_firestore'] || 0)
  const totalMisses = counters['cache_misses'] || 0
  const totalRequests = totalHits + totalMisses
  const evictions = counters['cache_evictions'] || 0

  const cacheStats = {
    hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
    missRate: totalRequests > 0 ? totalMisses / totalRequests : 0,
    evictionRate: totalRequests > 0 ? evictions / totalRequests : 0,
  }

  return {
    counters: { ...counters },
    histograms: h,
    activeRuns,
    cacheStats,
  }
}
