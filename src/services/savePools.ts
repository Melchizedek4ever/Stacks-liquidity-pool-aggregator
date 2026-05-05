import { upsertPools } from "../db/pools"
import { Pool } from "../types/pool"
import { withRetry } from "../utils/retry"

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object") {
    const message = (error as Record<string, unknown>).message
    if (typeof message === "string") return message
  }
  return String(error)
}

function createPoolId(pool: Pool): string {
  if (pool.pool_id?.trim()) return pool.pool_id.trim()
  return `${pool.dex}:${pool.tokenA}:${pool.tokenB}`.toLowerCase()
}

function choosePoolForBatch(existing: Pool, incoming: Pool): Pool {
  const existingTime = existing.last_trade_time ?? existing.last_updated
  const incomingTime = incoming.last_trade_time ?? incoming.last_updated

  if (incomingTime > existingTime) return incoming
  if (incomingTime === existingTime && incoming.liquidity_usd > existing.liquidity_usd) {
    return incoming
  }
  return existing
}

export function deduplicatePoolsByPoolId(pools: Pool[]): Pool[] {
  const poolMap = pools.reduce((map, pool) => {
    const normalizedPool = {
      ...pool,
      pool_id: createPoolId(pool)
    }
    const existing = map.get(normalizedPool.pool_id)

    map.set(
      normalizedPool.pool_id,
      existing ? choosePoolForBatch(existing, normalizedPool) : normalizedPool
    )

    return map
  }, new Map<string, Pool>())

  return Array.from(poolMap.values())
}

export async function savePools(pools: Pool[]): Promise<number> {
  if (pools.length === 0) {
    console.info(JSON.stringify({ event: "pools_persist_skipped", reason: "empty_batch" }))
    return 0
  }

  const deduped = deduplicatePoolsByPoolId(pools)
  const duplicateCount = pools.length - deduped.length

  console.info(
    JSON.stringify({
      event: "pools_deduplicated",
      input_count: pools.length,
      duplicate_count: duplicateCount,
      output_count: deduped.length
    })
  )

  try {
    await withRetry(() => upsertPools(deduped), {
      operationName: "supabase pools upsert",
      retries: 4,
      minDelayMs: 1_000,
      maxDelayMs: 8_000
    })

    console.info(
      JSON.stringify({
        event: "pools_persisted",
        persisted: deduped.length
      })
    )
    return deduped.length
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "pools_persist_failed",
        attempted: deduped.length,
        error: getErrorMessage(error)
      })
    )
    return 0
  }
}
