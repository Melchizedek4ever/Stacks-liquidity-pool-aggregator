export interface Pool {
  dex: string
  tokenA: string
  tokenB: string
  liquidity_usd: number
  apy: number
  volume_24h: number
  last_updated: number
}

export interface RankedPool extends Pool {
  score: number
}
