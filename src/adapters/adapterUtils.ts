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

  for (const raw of rawPools) {
    if (!raw || typeof raw !== "object") continue
    const mapped = mapper(raw as Record<string, unknown>)
    const tokenA = typeof mapped.tokenA === "string" ? mapped.tokenA : ""
    const tokenB = typeof mapped.tokenB === "string" ? mapped.tokenB : ""
    const liquidity = toNumber(mapped.liquidity_usd)
    const apy = toNumber(mapped.apy)
    const volume = toNumber(mapped.volume_24h)
    const lastUpdated = toTimestamp(mapped.last_updated) ?? Date.now()
    const lastTradeTime = toTimestamp(mapped.last_trade_time) ?? lastUpdated

    if (!tokenA || !tokenB || liquidity === null || apy === null || volume === null) {
      continue
    }

    pools.push({
      dex,
      pool_id: typeof mapped.pool_id === "string" ? mapped.pool_id : undefined,
      tokenA,
      tokenB,
      liquidity_usd: liquidity,
      apy,
      volume_24h: volume,
      last_trade_time: lastTradeTime,
      last_updated: lastUpdated
    })
  }

  return pools
}
