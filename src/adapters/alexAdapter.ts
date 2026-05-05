import { DexAdapter } from "./types"
import { fetchJsonWithRetry } from "../utils/retry"
import { mapAdapterPools, toPoolArray } from "./adapterUtils"

export const alexAdapter: DexAdapter = {
  name: "alex",
  async fetchPools() {
    const ALEX_API_URL = process.env.ALEX_API_URL
    if (!ALEX_API_URL) {
      console.warn("ALEX_API_URL is not configured; skipping alex adapter")
      return []
    }

    const data = await fetchJsonWithRetry<unknown>(ALEX_API_URL, undefined, {
      retries: 3
    })

    const rawPools = toPoolArray(data)
    return mapAdapterPools(rawPools, "alex", (raw) => ({
      pool_id: raw.pool_id ?? raw.poolId ?? raw.id,
      tokenA:
        raw.tokenA ?? raw.token_a ?? raw.tokenX ?? raw.token_x ?? raw.token0,
      tokenB:
        raw.tokenB ?? raw.token_b ?? raw.tokenY ?? raw.token_y ?? raw.token1,
      liquidity_usd:
        raw.liquidity_usd ?? raw.liquidityUSD ?? raw.tvl_usd ?? raw.tvlUsd,
      apy: raw.apy ?? raw.apr ?? raw.apy_24h ?? raw.apr_24h,
      volume_24h:
        raw.volume_24h ?? raw.volume24h ?? raw.volumeUSD24h ?? raw.volumeUsd24h,
      last_trade_time:
        raw.last_trade_time ?? raw.lastTradeTime ?? raw.last_trade_at ?? raw.lastTradeAt,
      last_updated:
        raw.last_updated ?? raw.lastUpdated ?? raw.updated_at ?? raw.updatedAt
    }))
  }
}
