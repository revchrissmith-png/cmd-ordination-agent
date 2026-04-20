// utils/fetchWithTimeout.ts
// Wraps fetch() with an AbortController timeout to prevent hanging requests.
// Default timeout: 30 seconds. Email/AI operations may use longer timeouts.

export class FetchTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs / 1000}s`)
    this.name = 'FetchTimeoutError'
  }
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 30_000, ...fetchOptions } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, { ...fetchOptions, signal: controller.signal })
    return res
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new FetchTimeoutError(url, timeoutMs)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
