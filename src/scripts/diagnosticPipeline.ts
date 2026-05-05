import "../config"
import { aggregatePools } from "../services/aggregator"
import { rankPools } from "../services/ranking"
import { MIN_VALIDATION_SCORE } from "../utils/validatePool"

const capturedEvents: any[] = []
const originalInfo = console.info
const originalWarn = console.warn
const originalError = console.error

const capture = (value: unknown) => {
  try {
    capturedEvents.push(JSON.parse(String(value)))
  } catch {
    // non-JSON logs are ignored for this diagnostic run
  }
}

console.info = (value?: unknown, ...rest: unknown[]) => {
  capture(value)
  return originalInfo(value, ...rest)
}

console.warn = (value?: unknown, ...rest: unknown[]) => {
  capture(value)
  return originalWarn(value, ...rest)
}

console.error = (value?: unknown, ...rest: unknown[]) => {
  capture(value)
  return originalError(value, ...rest)
}

const getEvents = (name: string) => capturedEvents.filter((event) => event.event === name)

async function run(): Promise<void> {
  const aggregation = await aggregatePools()
  const ranked = rankPools(aggregation.pools)
  const eligible = ranked.filter((pool) => (pool.validation_score ?? 0) >= MIN_VALIDATION_SCORE)

  const summary = {
    event: "diagnostic_pipeline_summary",
    complete: getEvents("aggregation_complete").at(-1) ?? null,
    quality: getEvents("aggregation_quality_summary").at(-1) ?? null,
    qualityDistribution: getEvents("quality_distribution").at(-1) ?? null,
    rejected: getEvents("pool_rejected").length,
    qualityIssues: getEvents("pool_quality_issues").length,
    adapterHealth: getEvents("adapter_health"),
    adapterWarnings: getEvents("adapter_warning"),
    ranked: ranked.length,
    eligible: eligible.length
  }

  originalInfo(JSON.stringify(summary, null, 2))
}

run().catch((error) => {
  originalError(error)
  process.exit(1)
})
