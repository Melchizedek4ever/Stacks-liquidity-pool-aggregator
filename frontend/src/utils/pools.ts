import { ApiPool, Pool, PoolSource } from "../types/pool";

const knownSources = new Set<PoolSource>(["bitflow", "velar", "alex", "unknown"]);

export function normalizePool(pool: ApiPool, index: number): Pool {
  const source = normalizeSource(pool.dex);
  const token0 = pool.token_a?.trim() || "Unknown";
  const token1 = pool.token_b?.trim() || "Unknown";
  const liquidityUSD = safeNumber(pool.liquidity_usd);
  const volume24h = safeNumber(pool.volume_24h);
  const apy = safeNumber(pool.apy);
  const lastUpdated = typeof pool.last_updated === "number" ? pool.last_updated : null;
  const id = `${source}-${token0}-${token1}-${index}`;

  return {
    id,
    token0,
    token1,
    liquidityUSD,
    volume24h,
    apy,
    source,
    lastUpdated
  };
}

export function normalizeSource(value?: string): PoolSource {
  const normalized = value?.toLowerCase() as PoolSource | undefined;
  return normalized && knownSources.has(normalized) ? normalized : "unknown";
}

function safeNumber(value?: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
