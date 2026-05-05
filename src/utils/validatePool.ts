import { Pool, PoolQualityTier, ValidationResult } from "../types/pool"

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
export const DISPLAY_MIN_SCORE = numberFromEnv("DISPLAY_MIN_SCORE", 65)

const maxStaleMs = MAX_STALE_HOURS * 60 * 60 * 1000

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)))

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

export function getPoolLastTradeTime(pool: Pool): number {
  return pool.last_trade_time ?? pool.last_updated
}

export function getQualityTier(score: number): PoolQualityTier {
  if (score >= 80) return "high"
  if (score >= 65) return "medium"
  if (score >= 50) return "low"
  return "junk"
}

export function assessPoolValidation(pool: Pool, now = Date.now()): ValidationResult {
  const flags = new Set<string>()
  const hardRejectionReasons: string[] = []
  let score = 100

  if (!pool.tokenA || !pool.tokenB) {
    hardRejectionReasons.push("missing_token")
  }

  if (!pool.pool_id?.trim()) {
    hardRejectionReasons.push("invalid_pool_id")
  }

  if (!isFiniteNumber(pool.last_updated)) {
    hardRejectionReasons.push("invalid_structure:last_updated")
  }

  if (pool.apy === null || !isFiniteNumber(pool.apy)) {
    flags.add("missing_apy")
    score -= 10
  }

  if (pool.liquidity_usd === null || !isFiniteNumber(pool.liquidity_usd)) {
    flags.add("invalid_format:liquidity_usd")
    score -= 25
  } else if (pool.liquidity_usd < MIN_LIQUIDITY_USD) {
    flags.add("low_liquidity")
    score -= 20
  }

  if (pool.volume_24h === null || !isFiniteNumber(pool.volume_24h)) {
    flags.add("invalid_format:volume_24h")
    score -= 15
  } else if (pool.volume_24h < MIN_VOLUME_24H_USD) {
    flags.add("low_volume")
    score -= 15
  }

  const lastTradeTime = getPoolLastTradeTime(pool)
  if (!isFiniteNumber(lastTradeTime)) {
    flags.add("invalid_format:last_trade_time")
    score -= 10
  } else if (now - lastTradeTime > maxStaleMs) {
    flags.add("stale_data")
    score -= 15
  }

  return {
    score: clampScore(score),
    flags: [...flags],
    is_rejected: hardRejectionReasons.length > 0,
    hard_rejection_reasons: hardRejectionReasons.length ? hardRejectionReasons : undefined
  }
}

export function shouldKeepPoolForRanking(validation: ValidationResult): boolean {
  return !validation.is_rejected
}

export function shouldDisplayPool(score: number): boolean {
  return score >= DISPLAY_MIN_SCORE
}

// Legacy compatibility helpers.
export function getPoolValidationReason(pool: Pool, now = Date.now()): string | null {
  const result = assessPoolValidation(pool, now)
  if (result.is_rejected) {
    return result.hard_rejection_reasons?.join(",") ?? "rejected"
  }
  return result.flags[0] ?? null
}

export function validatePool(pool: Pool): boolean {
  const result = assessPoolValidation(pool)
  return !result.is_rejected && result.score >= MIN_VALIDATION_SCORE
}
