import { AdapterPool } from "./types"
import { toNumber } from "../utils/number"
import { toTimestamp } from "../utils/time"

export interface RawPoolMapping {
  pool_id?: unknown
  tokenA: unknown
  tokenB: unknown
  liquidity_usd: unknown
  apy: unknown
  volume_24h: unknown
  last_trade_time?: unknown
  last_updated: unknown
  fee_bps?: unknown
}

interface AdapterNormalizationStats {
  rows_seen: number
  rows_normalized: number
  rows_skipped_invalid_shape: number
  missing_pool_id: number
  missing_token_fields: number
  invalid_liquidity_usd: number
  invalid_apy: number
  invalid_volume_24h: number
}

const includeRawPoolData = process.env.INCLUDE_RAW_POOL_DATA === "true"

function logNormalizationSummary(dex: string, stats: AdapterNormalizationStats): void {
  console.info(
    JSON.stringify({
      event: "adapter_normalization_summary",
      dex,
      ...stats
    })
  )
}

export const toPoolArray = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.pools)) return record.pools
    if (Array.isArray(record.data)) return record.data
    if (Array.isArray(record.results)) return record.results
  }
  return []
}

export function mapAdapterPools(
  rawPools: unknown[],
  dex: string,
  mapper: (raw: Record<string, unknown>) => RawPoolMapping
): AdapterPool[] {
  const pools: AdapterPool[] = []
  const stats: AdapterNormalizationStats = {
    rows_seen: rawPools.length,
    rows_normalized: 0,
    rows_skipped_invalid_shape: 0,
    missing_pool_id: 0,
    missing_token_fields: 0,
    invalid_liquidity_usd: 0,
    invalid_apy: 0,
    invalid_volume_24h: 0
  }

  for (const raw of rawPools) {
    if (!raw || typeof raw !== "object") {
      stats.rows_skipped_invalid_shape += 1
      continue
    }

    const mapped = mapper(raw as Record<string, unknown>)
    const tokenA = typeof mapped.tokenA === "string" ? mapped.tokenA.trim() : ""
    const tokenB = typeof mapped.tokenB === "string" ? mapped.tokenB.trim() : ""
    const liquidity = toNumber(mapped.liquidity_usd)
    const apy = toNumber(mapped.apy)
    const volume = toNumber(mapped.volume_24h)
    const lastUpdated = toTimestamp(mapped.last_updated) ?? Date.now()
    const lastTradeTime = toTimestamp(mapped.last_trade_time) ?? lastUpdated
    const feeBps = toNumber(mapped.fee_bps)
    const poolId = typeof mapped.pool_id === "string" ? mapped.pool_id.trim() : ""
    const normalizationFlags: string[] = []

    if (!poolId) {
      stats.missing_pool_id += 1
      normalizationFlags.push("missing_pool_id")
    }

    if (!tokenA || !tokenB) {
      stats.missing_token_fields += 1
      normalizationFlags.push("missing_token")
    }

    if (liquidity === null) {
      stats.invalid_liquidity_usd += 1
      normalizationFlags.push("invalid_format:liquidity_usd")
    }

    if (apy === null) {
      stats.invalid_apy += 1
      normalizationFlags.push("invalid_format:apy")
    }

    if (volume === null) {
      stats.invalid_volume_24h += 1
      normalizationFlags.push("invalid_format:volume_24h")
    }

    pools.push({
      dex,
      pool_id: poolId,
      tokenA,
      tokenB,
      liquidity_usd: liquidity,
      apy,
      volume_24h: volume,
      fee_bps: feeBps,
      last_trade_time: lastTradeTime,
      last_updated: lastUpdated,
      normalization_flags: normalizationFlags.length ? normalizationFlags : undefined,
      raw_data: includeRawPoolData ? (raw as Record<string, unknown>) : undefined
    })

    stats.rows_normalized += 1
  }

  logNormalizationSummary(dex, stats)

  return pools
}
