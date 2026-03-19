export type PoolSource = "bitflow" | "velar" | "alex" | "unknown";

export interface ApiPool {
  dex?: string;
  token_a?: string;
  token_b?: string;
  liquidity_usd?: number;
  apy?: number;
  volume_24h?: number;
  last_updated?: number;
}

export interface Pool {
  id: string;
  token0: string;
  token1: string;
  liquidityUSD: number;
  volume24h: number;
  apy: number;
  source: PoolSource;
  lastUpdated: number | null;
}

export interface PoolsState {
  pools: Pool[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
}
