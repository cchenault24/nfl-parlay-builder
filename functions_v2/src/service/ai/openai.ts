import OpenAI from 'openai'

export function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY
  if (!key || key.length === 0) return null
  return new OpenAI({ apiKey: key })
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('timeout')), ms)
  })
  const result = await Promise.race([promise, timeoutPromise])
  if (timeoutHandle) clearTimeout(timeoutHandle)
  return result as T
}
