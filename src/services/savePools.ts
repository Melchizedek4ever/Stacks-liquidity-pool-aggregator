import { upsertPools } from "../db/pools"
import { Pool } from "../types/pool"

export async function savePools(pools: Pool[]): Promise<void> {
  if (pools.length === 0) {
    console.info("No pools to persist")
    return
  }

  // Deduplicate pools by (dex, tokenA, tokenB), keeping the one with highest liquidity
  const poolMap = new Map<string, Pool>()
  
  for (const pool of pools) {
    const key = `${pool.dex}:${pool.tokenA}:${pool.tokenB}`
    const existing = poolMap.get(key)
    
    if (!existing || pool.liquidity_usd > existing.liquidity_usd) {
      poolMap.set(key, pool)
    }
  }

  const deduped = Array.from(poolMap.values())
  console.info(`Deduped ${pools.length} pools → ${deduped.length} unique pools`)

  try {
    await upsertPools(deduped)
    console.info(`Persisted ${deduped.length} pools`)
  } catch (error) {
    console.error("Failed to persist pools", error)
  }
}
