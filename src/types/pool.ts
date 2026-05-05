export interface Pool {
  dex: string
  pool_id: string
  tokenA: string
  tokenB: string
  liquidity_usd: number | null
  apy: number | null
  volume_24h: number | null
  last_trade_time?: number
  last_updated: number
  fee_bps?: number | null
  source?: "api" | "mock"
  validation_score?: number
  validation_flags?: string[]
  normalization_flags?: string[]
  raw_data?: Record<string, unknown>
  tokenA_verified?: boolean
  tokenB_verified?: boolean
  tokenA_symbol?: string
  tokenB_symbol?: string
}

export interface PoolQualityFlags {
  is_verified_pair: boolean
  is_stale: boolean
  is_low_liquidity: boolean
}

export interface RankedPool extends Pool {
  score: number
  confidence: number
  flags: PoolQualityFlags
  component_scores: {
    liquidity_score: number
    volume_score: number
    recency_score: number
    token_quality_score: number
  }
}
