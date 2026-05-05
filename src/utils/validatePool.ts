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
export const MIN_VALIDATION_SCORE = numberFromEnv("MIN_VALIDATION_SCORE", 50)

const maxStaleMs = MAX_STALE_HOURS * 60 * 60 * 1000

export interface PoolValidationResult {
  validation_score: number
  validation_flags: string[]
  critical_reasons: string[]
  is_critical_failure: boolean
}

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)))

export function getPoolLastTradeTime(pool: Pool): number {
  return pool.last_trade_time ?? pool.last_updated
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

export function assessPoolValidation(pool: Pool, now = Date.now()): PoolValidationResult {
  const flags = new Set<string>(pool.normalization_flags ?? [])
  const criticalReasons: string[] = []
  let score = 100

  if (!pool.tokenA || !pool.tokenB) {
    flags.add("missing_token")
    criticalReasons.push("missing_token")
  }

  if (!pool.pool_id?.trim()) {
    flags.add("invalid_pool_id")
    criticalReasons.push("invalid_pool_id")
  }

  if (pool.apy === null || !isFiniteNumber(pool.apy)) {
    flags.add("missing_apy")
    score -= 10
  }

  if (pool.liquidity_usd === null || !isFiniteNumber(pool.liquidity_usd)) {
    flags.add("invalid_format:liquidity_usd")
    score -= 30
  } else if (pool.liquidity_usd < MIN_LIQUIDITY_USD) {
    flags.add("low_liquidity")
    score -= 20
  }

  if (pool.volume_24h === null || !isFiniteNumber(pool.volume_24h)) {
    flags.add("invalid_format:volume_24h")
    score -= 20
  } else if (pool.volume_24h < MIN_VOLUME_24H_USD) {
    flags.add("low_volume")
    score -= 15
  }

  if (!isFiniteNumber(pool.last_updated)) {
    flags.add("invalid_format:last_updated")
    score -= 30
  }

  const lastTradeTime = getPoolLastTradeTime(pool)
  if (!isFiniteNumber(lastTradeTime)) {
    flags.add("invalid_format:last_trade_time")
    score -= 20
  } else if (now - lastTradeTime > maxStaleMs) {
    flags.add("stale_data")
    score -= 15
  }

  return {
    validation_score: clampScore(score),
    validation_flags: [...flags],
    critical_reasons: criticalReasons,
    is_critical_failure: criticalReasons.length > 0
  }
}

export function shouldKeepPoolForRanking(result: PoolValidationResult): boolean {
  return !result.is_critical_failure
}

export function shouldKeepPoolByScore(
  result: PoolValidationResult,
  minScore = MIN_VALIDATION_SCORE
): boolean {
  return !result.is_critical_failure && result.validation_score >= minScore
}

// Compatibility helpers used by legacy call-sites.
export function getPoolValidationReason(pool: Pool, now = Date.now()): string | null {
  const result = assessPoolValidation(pool, now)
  if (result.critical_reasons.length > 0) return result.critical_reasons.join(",")
  return result.validation_flags[0] ?? null
}

export function validatePool(pool: Pool): boolean {
  return shouldKeepPoolByScore(assessPoolValidation(pool))
}
