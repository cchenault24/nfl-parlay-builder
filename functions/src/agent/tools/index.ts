type CircuitState = {
  failures: number
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
  const { timeoutMs, retries = 0, backoffMs = 200 } = opts
  const circuit = getCircuit(key)
  if (circuit.openUntil && circuit.openUntil > Date.now()) {
    throw Object.assign(new Error(`${key} circuit open`), {
      code: 'circuit_open',
    })
  }

  let attempt = 0
  while (true) {
    let timer: NodeJS.Timeout | undefined
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                Object.assign(new Error(`${key} timed out after ${timeoutMs}ms`), {
                  code: 'timeout',
                })
              ),
            timeoutMs
          )
        }),
      ])
      circuit.failures = 0
      return result
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
    } finally {
      clearTimeout(timer)
    }
  }
}
