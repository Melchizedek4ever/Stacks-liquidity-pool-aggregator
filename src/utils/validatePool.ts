import { Pool } from "../types/pool"

export function validatePool(pool: Pool): boolean {
  if (!pool.dex) return false
  if (!pool.tokenA || !pool.tokenB) return false
  if (!Number.isFinite(pool.liquidity_usd) || pool.liquidity_usd < 0) return false
  if (!Number.isFinite(pool.apy)) return false
  if (!Number.isFinite(pool.volume_24h) || pool.volume_24h < 0) return false
  if (!Number.isFinite(pool.last_updated) || pool.last_updated <= 0) return false

  return true
}
