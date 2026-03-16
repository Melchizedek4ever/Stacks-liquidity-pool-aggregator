import { upsertPools } from "../db/pools"
import { Pool } from "../types/pool"

export async function savePools(pools: Pool[]): Promise<void> {
  if (pools.length === 0) {
    console.info("No pools to persist")
    return
  }

  try {
    await upsertPools(pools)
    console.info(`Persisted ${pools.length} pools`)
  } catch (error) {
    console.error("Failed to persist pools", error)
  }
}
