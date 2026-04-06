export interface Pool {
  dex: string
  pool_id?: string
  tokenA: string
  tokenB: string
  liquidity_usd: number
  apy: number
  volume_24h: number
  last_updated: number
  fee_bps?: number
  source?: "api" | "mock"
}

export interface RankedPool extends Pool {
  score: number
}
