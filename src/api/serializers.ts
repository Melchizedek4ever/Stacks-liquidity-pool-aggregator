import { Pool, RankedPool } from "../types/pool"

export const toPoolResponse = (pool: Pool) => ({
  dex: pool.dex,
  token_a: pool.tokenA,
  token_b: pool.tokenB,
  liquidity_usd: pool.liquidity_usd,
  apy: pool.apy,
  volume_24h: pool.volume_24h,
  last_updated: pool.last_updated
})

export const toRankedPoolResponse = (pool: RankedPool) => ({
  ...toPoolResponse(pool),
  score: pool.score
})
