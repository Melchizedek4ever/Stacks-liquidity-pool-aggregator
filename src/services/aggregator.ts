import { dexAdapters } from "../adapters"
import { Pool } from "../types/pool"
import { getPoolValidationReason } from "../utils/validatePool"
import { logUnknownTokens, normalizeToken } from "./tokenResolver"

interface AggregationCounts {
  fetched: number
  validated: number
  filtered: number
}

function logEvent(event: string, data: Record<string, unknown>): void {
  console.info(JSON.stringify({ event, ...data }))
}

function logFilteredPool(adapterName: string, pool: Partial<Pool>, reason: string): void {
  console.warn(
    JSON.stringify({
      event: "pool_filtered",
      dex: adapterName,
      pool_id: pool.pool_id ?? "n/a",
      reason,
      tokenA: pool.tokenA,
      tokenB: pool.tokenB,
      liquidity_usd: pool.liquidity_usd,
      volume_24h: pool.volume_24h,
      last_trade_time: pool.last_trade_time ?? pool.last_updated
    })
  )
}

function createPoolId(pool: Pool): string {
  if (pool.pool_id?.trim()) return pool.pool_id.trim()
  return `${pool.dex}:${pool.tokenA}:${pool.tokenB}`.toLowerCase()
}

export async function aggregatePools(): Promise<Pool[]> {
  const settledResults = await Promise.allSettled(
    dexAdapters.map((adapter) => adapter.fetchPools())
  )

  const collected: Pool[] = []
  const counts: AggregationCounts = {
    fetched: 0,
    validated: 0,
    filtered: 0,
  }

  for (let i = 0; i < settledResults.length; i++) {
    const result = settledResults[i]
    const adapterName = dexAdapters[i].name

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

    logEvent("adapter_pools_fetched", {
      dex: adapterName,
      fetched: pools.length
    })

    for (const pool of pools) {
      try {
        if (!pool.tokenA || !pool.tokenB) {
          counts.filtered += 1
          logFilteredPool(adapterName, pool, "missing tokenA or tokenB")
          continue
        }

        const [tokenA, tokenB] = await Promise.all([
          normalizeToken(pool.tokenA),
          normalizeToken(pool.tokenB)
        ])

        if (!tokenA || !tokenB) {
          counts.filtered += 1
          logFilteredPool(adapterName, pool, "missing token metadata")
          continue
        }

        const normalizedPool: Pool = {
          ...pool,
          dex: pool.dex || adapterName,
          tokenA: tokenA.id,
          tokenB: tokenB.id,
          tokenA_symbol: tokenA.symbol,
          tokenB_symbol: tokenB.symbol,
          tokenA_verified: tokenA.verified,
          tokenB_verified: tokenB.verified,
          last_trade_time: pool.last_trade_time ?? pool.last_updated
        }

        normalizedPool.pool_id = createPoolId(normalizedPool)

        const reason = getPoolValidationReason(normalizedPool)
        if (reason) {
          counts.filtered += 1
          logFilteredPool(adapterName, normalizedPool, reason)
          continue
        }

        counts.validated += 1
        collected.push(normalizedPool)
      } catch (err) {
        counts.filtered += 1
        console.error(
          JSON.stringify({
            event: "pool_normalization_error",
            dex: adapterName,
            pool_id: pool.pool_id ?? "n/a",
            error: err instanceof Error ? err.message : String(err)
          })
        )
      }
    }
  }

  logUnknownTokens()

  logEvent("aggregation_complete", {
    fetched: counts.fetched,
    validated: counts.validated,
    filtered: counts.filtered
  })

  return collected
}
