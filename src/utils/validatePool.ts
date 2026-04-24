import { Pool } from "../types/pool"

export function getPoolValidationReason(pool: Pool): string | null {
  if (!pool.tokenA || !pool.tokenB) return "missing tokenA or tokenB"

  if (pool.liquidity_usd < 100) return "liquidity_usd below minimum threshold (100)"

  return null
}

export function validatePool(pool: Pool): boolean {
  return getPoolValidationReason(pool) === null
}
