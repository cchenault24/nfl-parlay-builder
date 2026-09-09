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
  opts: {
    timeoutMs: number
    retries?: number
    backoffMs?: number
    // Error codes that mean "this specific request has no data" rather than
    // "the provider is broken" — e.g. a game the book hasn't posted lines
    // for yet. These don't count toward opening the circuit, so one game's
    // missing data can't take odds/stats down for every other game.
    nonCircuitErrorCodes?: string[]
  }
): Promise<T> {
  const { timeoutMs, retries = 0, backoffMs = 200, nonCircuitErrorCodes } = opts
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
      const code = (err as { code?: string }).code
      const isBusinessError = !!code && !!nonCircuitErrorCodes?.includes(code)
      if (!isBusinessError) {
        circuit.failures += 1
        if (circuit.failures >= 5) {
          circuit.openUntil = Date.now() + 15_000
        }
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
