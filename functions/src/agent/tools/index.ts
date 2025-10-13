import pLimit from 'p-limit'

type CircuitState = {
  failures: number
  lastFailureAt?: number
  openUntil?: number
}

const circuits = new Map<string, CircuitState>()

function getCircuit(key: string): CircuitState {
  const c = circuits.get(key) || { failures: 0 }
  circuits.set(key, c)
  return c
}

export async function withResilience<T>(
  key: string,
  fn: () => Promise<T>,
  opts: { timeoutMs: number; retries?: number; backoffMs?: number }
): Promise<T> {
  const { timeoutMs, retries = 1, backoffMs = 200 } = opts
  const circuit = getCircuit(key)
  const now = Date.now()
  if (circuit.openUntil && circuit.openUntil > now) {
    throw Object.assign(new Error('circuit_open'), {
      code: 'circuit_open',
      retriable: true,
    })
  }

  let attempt = 0
  while (true) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(Object.assign(new Error('timeout'), { code: 'timeout' })),
            timeoutMs
          )
        ),
      ])
      circuit.failures = 0
      return result as T
    } catch (err) {
      attempt += 1
      circuit.failures += 1
      if (circuit.failures >= 5) {
        circuit.openUntil = Date.now() + 15_000
      }
      if (attempt > retries) {
        throw err
      }
      await new Promise(r => setTimeout(r, backoffMs * attempt))
    }
  }
}

export const parallelLimit = pLimit(4)
