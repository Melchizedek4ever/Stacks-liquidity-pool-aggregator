import { fetchPools, fetchPoolsByDex, fetchTopPoolsByApy } from "../db/pools"
import { Pool, RankedPool } from "../types/pool"
import { rankPools } from "./ranking"
import { DISPLAY_MIN_SCORE } from "../utils/validatePool"

export async function getAllPools(): Promise<Pool[]> {
  return fetchPools()
}

export async function getPoolsByDex(dex: string): Promise<Pool[]> {
  return fetchPoolsByDex(dex)
}

export async function getTopPools(limit = 10): Promise<Pool[]> {
  return fetchTopPoolsByApy(limit)
}

export async function getBestPools(): Promise<RankedPool[]> {
  const pools = await fetchPools()
  return rankPools(pools).filter((pool) => pool.score >= DISPLAY_MIN_SCORE)
}
