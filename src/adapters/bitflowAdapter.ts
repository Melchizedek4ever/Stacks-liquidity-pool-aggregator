import { DexAdapter } from "./types"
import { fetchJsonWithRetry } from "../utils/retry"
import { mapAdapterPools, toPoolArray } from "./adapterUtils"

const BITFLOW_API_URL = process.env.BITFLOW_API_URL

export const bitflowAdapter: DexAdapter = {
  name: "bitflow",
  async fetchPools() {
    if (!BITFLOW_API_URL) {
      throw new Error("BITFLOW_API_URL is not configured")
    }

    const data = await fetchJsonWithRetry<unknown>(BITFLOW_API_URL, undefined, {
      retries: 3
    })

    const rawPools = toPoolArray(data)
    return mapAdapterPools(rawPools, "bitflow", (raw) => ({
      tokenA:
        raw.tokenA ?? raw.token_a ?? raw.token0 ?? raw.token0Symbol ?? raw.token0_symbol,
      tokenB:
        raw.tokenB ?? raw.token_b ?? raw.token1 ?? raw.token1Symbol ?? raw.token1_symbol,
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
