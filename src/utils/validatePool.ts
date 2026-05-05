import { Pool } from "../types/pool"

const numberFromEnv = (name: string, fallback: number): number => {
  const value = Number(process.env[name])
  return Number.isFinite(value) ? value : fallback
}

const qualityMode = process.env.POOL_QUALITY_MODE?.toLowerCase()

export const MIN_LIQUIDITY_USD = numberFromEnv(
  "MIN_LIQUIDITY_USD",
  qualityMode === "high" ? 5_000 : 1_000
)
export const MIN_VOLUME_24H_USD = numberFromEnv("MIN_VOLUME_24H_USD", 100)
export const MAX_STALE_HOURS = numberFromEnv("MAX_STALE_HOURS", 24)

const maxStaleMs = MAX_STALE_HOURS * 60 * 60 * 1000

export function getPoolLastTradeTime(pool: Pool): number {
  return pool.last_trade_time ?? pool.last_updated
}

export function getPoolValidationReason(pool: Pool, now = Date.now()): string | null {
  if (!pool.tokenA || !pool.tokenB) return "missing tokenA or tokenB"
  if (!pool.pool_id) return "missing pool_id"
  if (!Number.isFinite(pool.liquidity_usd)) return "invalid liquidity_usd"
  if (!Number.isFinite(pool.volume_24h)) return "invalid volume_24h"
  if (!Number.isFinite(pool.last_updated)) return "invalid last_updated"

  if (pool.liquidity_usd < MIN_LIQUIDITY_USD) {
    return `liquidity_usd below minimum threshold (${MIN_LIQUIDITY_USD})`
  }

  if (pool.volume_24h < MIN_VOLUME_24H_USD) {
    return `volume_24h below minimum threshold (${MIN_VOLUME_24H_USD})`
  }

  const lastTradeTime = getPoolLastTradeTime(pool)
  if (!Number.isFinite(lastTradeTime)) return "invalid last_trade_time"

  if (now - lastTradeTime > maxStaleMs) {
    return `last_trade_time older than ${MAX_STALE_HOURS}h`
  }

  return null
}

export function validatePool(pool: Pool): boolean {
  return getPoolValidationReason(pool) === null
}
