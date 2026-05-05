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
  if (
    incomingTime === existingTime &&
    (incoming.liquidity_usd ?? 0) > (existing.liquidity_usd ?? 0)
  ) {
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

export interface SavePoolsInput {
  eligible: Pool[]
  displayed: Pool[]
}

export interface SavePoolsResult {
  eligible_persisted: number
  displayed_persisted: number
}

export async function savePools(input: SavePoolsInput): Promise<SavePoolsResult> {
  const { eligible, displayed } = input

  if (eligible.length === 0) {
    console.info(JSON.stringify({ event: "pools_persist_skipped", reason: "empty_batch" }))
    return { eligible_persisted: 0, displayed_persisted: 0 }
  }

  const dedupedEligible = deduplicatePoolsByPoolId(eligible)
  const eligibleDuplicateCount = eligible.length - dedupedEligible.length
  const dedupedDisplayed = deduplicatePoolsByPoolId(displayed)
  const displayedDuplicateCount = displayed.length - dedupedDisplayed.length

  console.info(
    JSON.stringify({
      event: "pools_deduplicated",
      eligible_input_count: eligible.length,
      eligible_duplicate_count: eligibleDuplicateCount,
      eligible_output_count: dedupedEligible.length,
      displayed_input_count: displayed.length,
      displayed_duplicate_count: displayedDuplicateCount,
      displayed_output_count: dedupedDisplayed.length
    })
  )

  try {
    await withRetry(() => upsertPools(dedupedEligible), {
      operationName: "supabase eligible pools upsert",
      retries: 4,
      minDelayMs: 1_000,
      maxDelayMs: 8_000
    })

    if (dedupedDisplayed.length > 0) {
      await withRetry(() => upsertPools(dedupedDisplayed), {
        operationName: "supabase displayed pools upsert",
        retries: 4,
        minDelayMs: 1_000,
        maxDelayMs: 8_000
      })
    }

    console.info(
      JSON.stringify({
        event: "pools_persisted",
        eligible_persisted: dedupedEligible.length,
        displayed_persisted: dedupedDisplayed.length
      })
    )
    return {
      eligible_persisted: dedupedEligible.length,
      displayed_persisted: dedupedDisplayed.length
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "pools_persist_failed",
        attempted_eligible: dedupedEligible.length,
        attempted_displayed: dedupedDisplayed.length,
        error: getErrorMessage(error)
      })
    )
    return { eligible_persisted: 0, displayed_persisted: 0 }
  }
}
