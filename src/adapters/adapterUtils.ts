import { AdapterPool } from "./types"
import { toNumber } from "../utils/number"
import { toTimestamp } from "../utils/time"

export interface RawPoolMapping {
  tokenA: unknown
  tokenB: unknown
  liquidity_usd: unknown
  apy: unknown
  volume_24h: unknown
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

    if (!tokenA || !tokenB || liquidity === null || apy === null || volume === null) {
      continue
    }

    pools.push({
      dex,
      tokenA,
      tokenB,
      liquidity_usd: liquidity,
      apy,
      volume_24h: volume,
      last_updated: lastUpdated
    })
  }

  return pools
}
