import { supabase } from "./supabase"
import { Pool, PoolQualityTier, RankedPool } from "../types/pool"
import { toNumber } from "../utils/number"
import { toTimestamp } from "../utils/time"
import { isTransientError } from "../utils/retry"
import { MAX_STALE_HOURS } from "../utils/validatePool"

interface PoolRow {
  dex: string
  pool_id?: string | null
  token_a: string
  token_b: string
  token_a_symbol?: string | null
  token_b_symbol?: string | null
  token_a_verified?: boolean | null
  token_b_verified?: boolean | null
  liquidity_usd: number | string | null
  apy: number | string | null
  volume_24h: number | string | null
  last_updated: string
  last_trade_time?: string | null
  fee_bps?: number | string | null
  validation_score?: number | string | null
  validation_flags?: string[] | null
  quality_tier?: string | null
  score?: number | string | null
  is_displayed?: boolean | null
}

const staleMs = MAX_STALE_HOURS * 60 * 60 * 1000

const mapRowToPool = (row: PoolRow): Pool => ({
  dex: row.dex,
  pool_id: row.pool_id ?? "",
  tokenA: row.token_a,
  tokenB: row.token_b,
  tokenA_symbol: row.token_a_symbol ?? undefined,
  tokenB_symbol: row.token_b_symbol ?? undefined,
  tokenA_verified: row.token_a_verified ?? undefined,
  tokenB_verified: row.token_b_verified ?? undefined,
  liquidity_usd: toNumber(row.liquidity_usd),
  apy: toNumber(row.apy),
  volume_24h: toNumber(row.volume_24h),
  last_updated: toTimestamp(row.last_updated) ?? Date.now(),
  last_trade_time: row.last_trade_time ? toTimestamp(row.last_trade_time) ?? undefined : undefined,
  fee_bps: toNumber(row.fee_bps) ?? undefined,
  validation_score: toNumber(row.validation_score) ?? undefined,
  validation_flags: row.validation_flags ?? undefined,
  quality_tier: (row.quality_tier as PoolQualityTier) ?? undefined,
  is_displayed: row.is_displayed ?? undefined,
})

const mapRowToRankedPool = (row: PoolRow): RankedPool => {
  const pool = mapRowToPool(row)
  const score = toNumber(row.score) ?? 0
  const validationScore = pool.validation_score ?? 0
  const lastTradeTime = pool.last_trade_time ?? pool.last_updated

  return {
    ...pool,
    score,
    confidence: Number((validationScore / 100).toFixed(2)),
    flags: {
      is_verified_pair: (pool.tokenA_verified ?? false) && (pool.tokenB_verified ?? false),
      is_stale: Date.now() - lastTradeTime > staleMs,
      is_low_liquidity: (pool.liquidity_usd ?? 0) <= 0,
    },
  }
}

export async function upsertPools(pools: Pool[]): Promise<void> {
  if (pools.length === 0) return

  const rows = pools.map((pool) => {
    const ranked = pool as RankedPool
    return {
      dex: pool.dex,
      pool_id: pool.pool_id || null,
      token_a: pool.tokenA,
      token_b: pool.tokenB,
      token_a_symbol: pool.tokenA_symbol ?? null,
      token_b_symbol: pool.tokenB_symbol ?? null,
      token_a_verified: pool.tokenA_verified ?? null,
      token_b_verified: pool.tokenB_verified ?? null,
      liquidity_usd: pool.liquidity_usd ?? 0,
      apy: pool.apy ?? null,
      volume_24h: pool.volume_24h ?? 0,
      last_updated: new Date(pool.last_updated).toISOString(),
      last_trade_time: pool.last_trade_time ? new Date(pool.last_trade_time).toISOString() : null,
      fee_bps: pool.fee_bps ?? null,
      validation_score: pool.validation_score ?? null,
      validation_flags: pool.validation_flags ?? null,
      quality_tier: pool.quality_tier ?? null,
      score: typeof ranked.score === "number" ? ranked.score : null,
      is_displayed: pool.is_displayed ?? false,
    }
  })

  const { error } = await supabase
    .from("pools")
    .upsert(rows, { onConflict: "dex,pool_id" })

  if (!error) return

  if (error.code === "42501") {
    console.error(
      "[db] pools upsert blocked by RLS (code 42501). Use the service_role key or add explicit INSERT/UPDATE policies."
    )
    throw error
  }

  if (isTransientError(error)) {
    throw error
  }

  console.error(`[db] pools upsert failed: ${error.message}`)
  throw error
}

export async function fetchPools(): Promise<Pool[]> {
  const { data, error } = await supabase.from("pools").select("*")
  if (error) throw error
  return (data ?? []).map((row) => mapRowToPool(row as PoolRow))
}

export async function fetchDisplayedPools(): Promise<RankedPool[]> {
  const { data, error } = await supabase
    .from("pools")
    .select("*")
    .eq("is_displayed", true)
    .order("score", { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => mapRowToRankedPool(row as PoolRow))
}

export async function fetchPoolsByDex(dex: string): Promise<Pool[]> {
  const { data, error } = await supabase.from("pools").select("*").eq("dex", dex)
  if (error) throw error
  return (data ?? []).map((row) => mapRowToPool(row as PoolRow))
}

export async function fetchTopPoolsByApy(limit = 10): Promise<Pool[]> {
  const { data, error } = await supabase
    .from("pools")
    .select("*")
    .order("apy", { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []).map((row) => mapRowToPool(row as PoolRow))
}
