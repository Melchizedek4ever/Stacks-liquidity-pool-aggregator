export interface RetryOptions {
  retries: number
  minDelayMs: number
  maxDelayMs: number
  factor: number
  jitter: boolean
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  retries: 3,
  minDelayMs: 300,
  maxDelayMs: 2_000,
  factor: 2,
  jitter: true
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const calculateDelay = (attempt: number, options: RetryOptions) => {
  const exponential = options.minDelayMs * Math.pow(options.factor, attempt)
  const capped = Math.min(exponential, options.maxDelayMs)
  if (!options.jitter) return capped
  const jitter = Math.random() * capped * 0.2
  return capped - jitter
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const settings = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let attempt = 0

  while (true) {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= settings.retries) {
        throw error
      }

      const delay = calculateDelay(attempt, settings)
      await sleep(delay)
      attempt += 1
    }
  }
}

export async function fetchJsonWithRetry<T>(
  url: string,
  init?: RequestInit,
  options?: Partial<RetryOptions>
): Promise<T> {
  return withRetry(async () => {
    const response = await fetch(url, init)
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return (await response.json()) as T
  }, options)
}
