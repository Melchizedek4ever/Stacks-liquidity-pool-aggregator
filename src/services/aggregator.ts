import { dexAdapters } from "../adapters"

import { normalizePoolTokens } from "./tokenRegistry"

import { resolveToken, logUnknownTokens } from "./tokenResolver"
import { Pool } from "../types/pool"
import { getPoolValidationReason } from "../utils/validatePool"

export async function aggregatePools(): Promise<Pool[]> {
  const settledResults = await Promise.allSettled(
    dexAdapters.map((adapter) => adapter.fetchPools())
  )

  const collected: Pool[] = []

  for (let i = 0; i < settledResults.length; i++) {
    const result = settledResults[i]
    const adapterName = dexAdapters[i].name

    if (result.status !== "fulfilled") {
      console.error(`[aggregator] Adapter failed: ${adapterName}`)
      console.error(result.reason)
      continue
    }

    const pools = result.value

    for (const pool of pools) {
      try {
        if (!pool.tokenA || !pool.tokenB) {
          console.warn(
            `[aggregator] Filtered pool (${adapterName}) pool_id=${pool.pool_id ?? "n/a"} reason=missing tokenA or tokenB tokenA=${String(pool.tokenA)} tokenB=${String(pool.tokenB)}`
          )
          continue
        }

        const tokenA = await resolveToken(pool.tokenA)
        const tokenB = await resolveToken(pool.tokenB)

        if (!tokenA || !tokenB) {
          console.warn(
            `[aggregator] Filtered pool (${adapterName}) pool_id=${pool.pool_id ?? "n/a"} reason=unknown token tokenA=${pool.tokenA} tokenB=${pool.tokenB}`
          )
          continue
        }

        const normalizedPool: Pool = {
          ...pool,
          tokenA: tokenA.id,
          tokenB: tokenB.id,
        }

        const reason = getPoolValidationReason(normalizedPool)
        if (reason) {
          console.warn(
            `[aggregator] Filtered pool (${adapterName}) pool_id=${normalizedPool.pool_id ?? "n/a"} reason=${reason} tokenA=${normalizedPool.tokenA} tokenB=${normalizedPool.tokenB} liquidity_usd=${normalizedPool.liquidity_usd}`
          )
          continue
        }

        collected.push(normalizedPool)
      } catch (err) {
        console.error("[aggregator] Pool normalization error:", err)
      }
    }
  }

  logUnknownTokens()

  console.info(`[aggregator] ${collected.length} pools passed validation`)

  return collected
}
