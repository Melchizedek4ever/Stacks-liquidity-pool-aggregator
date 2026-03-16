import { dexAdapters } from "../adapters"
import { Pool } from "../types/pool"
import { validatePool } from "../utils/validatePool"
import { normalizePoolTokens } from "./tokenRegistry"

export async function aggregatePools(): Promise<Pool[]> {
  const settledResults = await Promise.allSettled(
    dexAdapters.map((adapter) => adapter.fetchPools())
  )

  const collected: Pool[] = []

  settledResults.forEach((result, index) => {
    const adapter = dexAdapters[index]
    if (result.status === "fulfilled") {
      collected.push(...result.value)
      return
    }

    console.error(`Adapter ${adapter.name} failed`, result.reason)
  })

  const normalized = await Promise.all(
    collected.map(async (pool) => {
      try {
        const tokens = await normalizePoolTokens(pool)
        if (!tokens) return null
        const normalizedPool = { ...pool, ...tokens }
        return validatePool(normalizedPool) ? normalizedPool : null
      } catch (error) {
        console.error(`Token normalization failed for ${pool.dex}`, error)
        return null
      }
    })
  )

  return normalized.filter((pool): pool is Pool => Boolean(pool))
}
