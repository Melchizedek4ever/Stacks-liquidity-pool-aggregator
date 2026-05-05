import { Pool, RankedPool } from "../types/pool"

export const toPoolResponse = (pool: Pool) => ({
  pool_id: pool.pool_id,
  dex: pool.dex,
  token_a: pool.tokenA,
  token_b: pool.tokenB,
  token_a_symbol: pool.tokenA_symbol,
  token_b_symbol: pool.tokenB_symbol,
  token_a_verified: pool.tokenA_verified,
  token_b_verified: pool.tokenB_verified,
  liquidity_usd: pool.liquidity_usd,
  apy: pool.apy,
  volume_24h: pool.volume_24h,
  validation_score: pool.validation_score,
  validation_flags: pool.validation_flags,
  normalization_flags: pool.normalization_flags,
  last_trade_time: pool.last_trade_time,
  last_updated: pool.last_updated
})

export const toRankedPoolResponse = (pool: RankedPool) => ({
  ...toPoolResponse(pool),
  score: pool.score,
  confidence: pool.confidence,
  flags: pool.flags,
  component_scores: pool.component_scores
})
