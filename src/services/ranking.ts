import { Pool, RankedPool } from "../types/pool"
import { assessPoolValidation, getPoolLastTradeTime, getQualityTier, MAX_STALE_HOURS } from "../utils/validatePool"
import { isVerifiedToken } from "./tokenResolver"

const APY_NORMALIZATION_CAP = Number(process.env.APY_NORMALIZATION_CAP ?? 100)

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

function logScore(value: number, maxValue: number): number {
  if (!Number.isFinite(value) || value <= 0 || maxValue <= 0) return 0
  const normalized = Math.log1p(value) / Math.log1p(maxValue)
  return clamp(normalized * 100, 0, 100)
}

function normalizeApy(apy: number | null): number {
  if (!Number.isFinite(apy) || apy === null || apy <= 0) return 0
  return clamp((apy / APY_NORMALIZATION_CAP) * 100, 0, 100)
}

export function rankPools(pools: Pool[], now = Date.now()): RankedPool[] {
  if (pools.length === 0) return []

  const maxLiquidity = Math.max(...pools.map((pool) => pool.liquidity_usd ?? 0), 0)
  const staleMs = MAX_STALE_HOURS * 60 * 60 * 1000

  return pools
    .map((pool) => {
      const validation = pool.validation ?? assessPoolValidation(pool, now)
      const validationScore = pool.validation_score ?? validation.score
      const normalizedApyScore = normalizeApy(pool.apy)
      const liquidityScore = logScore(pool.liquidity_usd ?? 0, maxLiquidity)

      // Quality-aware weighted ranking:
      // 60% validation quality, 25% APY attractiveness, 15% liquidity depth.
      const finalScore = clamp(
        validationScore * 0.6 + normalizedApyScore * 0.25 + liquidityScore * 0.15,
        0,
        100
      )

      const flags = {
        is_verified_pair:
          (pool.tokenA_verified ?? isVerifiedToken(pool.tokenA)) &&
          (pool.tokenB_verified ?? isVerifiedToken(pool.tokenB)),
        is_stale: now - getPoolLastTradeTime(pool) > staleMs,
        is_low_liquidity: (pool.liquidity_usd ?? 0) <= 0
      }

      return {
        ...pool,
        validation: validation,
        validation_score: validationScore,
        validation_flags: pool.validation_flags ?? validation.flags,
        quality_tier: getQualityTier(validationScore),
        score: Number(finalScore.toFixed(2)),
        confidence: Number((validationScore / 100).toFixed(2)),
        flags,
        component_scores: {
          validation_score: Number(validationScore.toFixed(2)),
          normalized_apy: Number(normalizedApyScore.toFixed(2)),
          liquidity_score: Number(liquidityScore.toFixed(2))
        }
      }
    })
    .sort((a, b) => b.score - a.score)
}
