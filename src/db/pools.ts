import { supabase } from "./supabase"
import { Pool } from "../types/pool"
import { toNumber } from "../utils/number"
import { toTimestamp } from "../utils/time"

interface PoolRow {
  dex: string
  token_a: string
  token_b: string
  liquidity_usd: number | string
  apy: number | string
  volume_24h: number | string
  last_updated: string
}

const mapRowToPool = (row: PoolRow): Pool => {
  return {
    dex: row.dex,
    tokenA: row.token_a,
    tokenB: row.token_b,
    liquidity_usd: toNumber(row.liquidity_usd) ?? 0,
    apy: toNumber(row.apy) ?? 0,
    volume_24h: toNumber(row.volume_24h) ?? 0,
    last_updated: toTimestamp(row.last_updated) ?? Date.now()
  }
}

export async function upsertPools(pools: Pool[]): Promise<void> {
  if (pools.length === 0) return

  const rows = pools.map((pool) => ({
    dex: pool.dex,
    token_a: pool.tokenA,
    token_b: pool.tokenB,
    liquidity_usd: pool.liquidity_usd,
    apy: pool.apy,
    volume_24h: pool.volume_24h,
    last_updated: new Date(pool.last_updated).toISOString()
  }))

  const { error } = await supabase
    .from("pools")
    .upsert(rows, { onConflict: "dex,token_a,token_b" })

  if (error) {
    throw error
  }
}

export async function fetchPools(): Promise<Pool[]> {
  const { data, error } = await supabase.from("pools").select("*")
  if (error) {
    throw error
  }
  return (data ?? []).map((row) => mapRowToPool(row as PoolRow))
}

export async function fetchPoolsByDex(dex: string): Promise<Pool[]> {
  const { data, error } = await supabase.from("pools").select("*").eq("dex", dex)
  if (error) {
    throw error
  }
  return (data ?? []).map((row) => mapRowToPool(row as PoolRow))
}

export async function fetchTopPoolsByApy(limit = 10): Promise<Pool[]> {
  const { data, error } = await supabase
    .from("pools")
    .select("*")
    .order("apy", { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }
  return (data ?? []).map((row) => mapRowToPool(row as PoolRow))
}
