import { Pool, RankedPool } from "../types/pool"

const APY_WEIGHT = 0.5
const LIQUIDITY_WEIGHT = 0.3
const VOLUME_WEIGHT = 0.2

export function rankPools(pools: Pool[]): RankedPool[] {
  if (pools.length === 0) return []

  const maxApy = Math.max(...pools.map((pool) => pool.apy), 0)
  const maxLiquidity = Math.max(...pools.map((pool) => pool.liquidity_usd), 0)
  const maxVolume = Math.max(...pools.map((pool) => pool.volume_24h), 0)

  return pools
    .map((pool) => {
      const normalizedApy = maxApy > 0 ? pool.apy / maxApy : 0
      const normalizedLiquidity = maxLiquidity > 0 ? pool.liquidity_usd / maxLiquidity : 0
      const normalizedVolume = maxVolume > 0 ? pool.volume_24h / maxVolume : 0
      const score =
        APY_WEIGHT * normalizedApy +
        LIQUIDITY_WEIGHT * normalizedLiquidity +
        VOLUME_WEIGHT * normalizedVolume

      return { ...pool, score }
    })
    .sort((a, b) => b.score - a.score)
}
