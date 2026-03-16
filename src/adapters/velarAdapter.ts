import { DexAdapter } from "./types"
import { fetchJsonWithRetry } from "../utils/retry"
import { mapAdapterPools, toPoolArray } from "./adapterUtils"

const VELAR_API_URL = process.env.VELAR_API_URL

export const velarAdapter: DexAdapter = {
  name: "velar",
  async fetchPools() {
    if (!VELAR_API_URL) {
      throw new Error("VELAR_API_URL is not configured")
    }

    const data = await fetchJsonWithRetry<unknown>(VELAR_API_URL, undefined, {
      retries: 3
    })

    const rawPools = toPoolArray(data)
    return mapAdapterPools(rawPools, "velar", (raw) => ({
      tokenA:
        raw.tokenA ?? raw.token_a ?? raw.baseToken ?? raw.base_token ?? raw.token0,
      tokenB:
        raw.tokenB ?? raw.token_b ?? raw.quoteToken ?? raw.quote_token ?? raw.token1,
      liquidity_usd:
        raw.liquidity_usd ?? raw.liquidityUSD ?? raw.tvl_usd ?? raw.tvlUsd,
      apy: raw.apy ?? raw.apr ?? raw.apy_24h ?? raw.apr_24h,
      volume_24h:
        raw.volume_24h ?? raw.volume24h ?? raw.volumeUSD24h ?? raw.volumeUsd24h,
      last_updated:
        raw.last_updated ?? raw.lastUpdated ?? raw.updated_at ?? raw.updatedAt
    }))
  }
}
