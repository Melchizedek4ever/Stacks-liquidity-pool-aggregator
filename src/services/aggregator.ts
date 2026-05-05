import { appendFile } from "node:fs/promises"
import { dexAdapters } from "../adapters"
import { Pool } from "../types/pool"
import {
  assessPoolValidation,
  PoolValidationResult,
  shouldKeepPoolForRanking
} from "../utils/validatePool"
import { logUnknownTokens, normalizeToken } from "./tokenResolver"

interface AggregationCounts {
  fetched: number
  scored: number
  retained: number
  rejected: number
}

interface AdapterHealth {
  fetched: number
  valid: number
  rejected: number
  score_total: number
}

interface RejectionLogRecord {
  event: "pool_rejected"
  pool_id: string
  dex: string
  reasons: string[]
  validation_score: number
  raw_data: Record<string, unknown> | null
}

export interface AggregationResult {
  pools: Pool[]
  fetched: number
  scored: number
  retained: number
  rejected: number
}

const rejectedPoolsDebugFile = process.env.REJECTED_POOLS_DEBUG_FILE?.trim()

function logEvent(event: string, data: Record<string, unknown>): void {
  console.info(JSON.stringify({ event, ...data }))
}

function formatRawData(pool: Pool): Record<string, unknown> | null {
  if (!pool.raw_data) return null
  return pool.raw_data
}

function logRejectedPool(pool: Pool, validation: PoolValidationResult): void {
  const payload: RejectionLogRecord = {
    event: "pool_rejected",
    pool_id: pool.pool_id || "n/a",
    dex: pool.dex,
    reasons: validation.critical_reasons.length
      ? validation.critical_reasons
      : validation.validation_flags,
    validation_score: validation.validation_score,
    raw_data: formatRawData(pool)
  }
  console.warn(JSON.stringify(payload))
}

function logDowngradedPool(pool: Pool, validation: PoolValidationResult): void {
  if (validation.validation_flags.length === 0) return

  console.info(
    JSON.stringify({
      event: "pool_downgraded",
      pool_id: pool.pool_id || "n/a",
      dex: pool.dex,
      reasons: validation.validation_flags,
      validation_score: validation.validation_score,
      raw_data: formatRawData(pool)
    })
  )
}

function trackReasonCounts(
  reasonCounts: Record<string, number>,
  reasons: string[]
): void {
  for (const reason of reasons) {
    reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1
  }
}

function toTopReasons(reasonCounts: Record<string, number>, limit = 10): Array<{
  reason: string
  count: number
}> {
  return Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([reason, count]) => ({ reason, count }))
}

async function persistRejectedDebugRecords(records: RejectionLogRecord[]): Promise<void> {
  if (!rejectedPoolsDebugFile || records.length === 0) return
  const lines = records.map((record) => JSON.stringify(record)).join("\n") + "\n"
  await appendFile(rejectedPoolsDebugFile, lines, { encoding: "utf8" })
}

export async function aggregatePools(): Promise<AggregationResult> {
  const settledResults = await Promise.allSettled(
    dexAdapters.map((adapter) => adapter.fetchPools())
  )

  const collected: Pool[] = []
  const rejectedRecords: RejectionLogRecord[] = []
  const rejectionReasons: Record<string, number> = {}
  const counts: AggregationCounts = {
    fetched: 0,
    scored: 0,
    retained: 0,
    rejected: 0
  }

  const adapterHealth: Record<string, AdapterHealth> = {}

  for (let i = 0; i < settledResults.length; i++) {
    const result = settledResults[i]
    const adapterName = dexAdapters[i].name
    adapterHealth[adapterName] = {
      fetched: 0,
      valid: 0,
      rejected: 0,
      score_total: 0
    }

    if (result.status !== "fulfilled") {
      console.error(
        JSON.stringify({
          event: "adapter_failed",
          dex: adapterName,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason)
        })
      )
      continue
    }

    const pools = result.value
    counts.fetched += pools.length
    adapterHealth[adapterName].fetched += pools.length

    logEvent("adapter_pools_fetched", {
      dex: adapterName,
      fetched: pools.length
    })

    for (const pool of pools) {
      try {
        const normalizedPool: Pool = {
          ...pool,
          dex: pool.dex || adapterName,
          pool_id: pool.pool_id?.trim() ?? ""
        }

        const [tokenA, tokenB] = await Promise.all([
          normalizeToken(normalizedPool.tokenA),
          normalizeToken(normalizedPool.tokenB)
        ])

        if (tokenA) {
          normalizedPool.tokenA = tokenA.id
          normalizedPool.tokenA_symbol = tokenA.symbol
          normalizedPool.tokenA_verified = tokenA.verified
        }

        if (tokenB) {
          normalizedPool.tokenB = tokenB.id
          normalizedPool.tokenB_symbol = tokenB.symbol
          normalizedPool.tokenB_verified = tokenB.verified
        }

        const validation = assessPoolValidation(normalizedPool)
        normalizedPool.validation_score = validation.validation_score
        normalizedPool.validation_flags = validation.validation_flags

        counts.scored += 1
        adapterHealth[adapterName].score_total += validation.validation_score
        trackReasonCounts(rejectionReasons, validation.validation_flags)

        if (!shouldKeepPoolForRanking(validation)) {
          counts.rejected += 1
          adapterHealth[adapterName].rejected += 1
          logRejectedPool(normalizedPool, validation)
          rejectedRecords.push({
            event: "pool_rejected",
            pool_id: normalizedPool.pool_id,
            dex: normalizedPool.dex,
            reasons: validation.critical_reasons.length
              ? validation.critical_reasons
              : validation.validation_flags,
            validation_score: validation.validation_score,
            raw_data: formatRawData(normalizedPool)
          })
          continue
        }

        counts.retained += 1
        adapterHealth[adapterName].valid += 1
        logDowngradedPool(normalizedPool, validation)
        collected.push(normalizedPool)
      } catch (err) {
        counts.rejected += 1
        adapterHealth[adapterName].rejected += 1
        console.error(
          JSON.stringify({
            event: "pool_normalization_error",
            dex: adapterName,
            pool_id: pool.pool_id || "n/a",
            error: err instanceof Error ? err.message : String(err)
          })
        )
      }
    }
  }

  logUnknownTokens()
  await persistRejectedDebugRecords(rejectedRecords)

  const rejectionRate = counts.fetched > 0 ? counts.rejected / counts.fetched : 0
  logEvent("aggregation_complete", {
    fetched: counts.fetched,
    scored: counts.scored,
    retained: counts.retained,
    rejected: counts.rejected,
    rejection_rate: Number(rejectionRate.toFixed(4))
  })

  logEvent("aggregation_quality_summary", {
    rejection_rate: Number(rejectionRate.toFixed(4)),
    top_rejection_reasons: toTopReasons(rejectionReasons)
  })

  for (const [adapter, stats] of Object.entries(adapterHealth)) {
    const adapterRejectionRate = stats.fetched > 0 ? stats.rejected / stats.fetched : 0
    const averageValidationScore =
      stats.valid + stats.rejected > 0
        ? stats.score_total / (stats.valid + stats.rejected)
        : 0

    logEvent("adapter_health", {
      adapter,
      pools_fetched: stats.fetched,
      pools_valid: stats.valid,
      pools_rejected: stats.rejected,
      rejection_rate: Number(adapterRejectionRate.toFixed(4)),
      average_validation_score: Number(averageValidationScore.toFixed(2))
    })
  }

  return {
    pools: collected,
    fetched: counts.fetched,
    scored: counts.scored,
    retained: counts.retained,
    rejected: counts.rejected
  }
}
