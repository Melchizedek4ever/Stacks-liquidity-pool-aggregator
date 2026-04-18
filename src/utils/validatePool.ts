import { Pool } from "../types/pool"

export function validatePool(pool: Pool): boolean {
  if (!pool.tokenA || !pool.tokenB) return false

  if (pool.liquidity_usd < 100) return false // lower threshold initially

  return true
}