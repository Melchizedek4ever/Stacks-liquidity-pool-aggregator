"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertPools = upsertPools;
exports.fetchPools = fetchPools;
exports.fetchPoolsByDex = fetchPoolsByDex;
exports.fetchTopPoolsByApy = fetchTopPoolsByApy;
const supabase_1 = require("./supabase");
const number_1 = require("../utils/number");
const time_1 = require("../utils/time");
const retry_1 = require("../utils/retry");
const mapRowToPool = (row) => {
    return {
        dex: row.dex,
        pool_id: row.pool_id ?? undefined,
        tokenA: row.token_a,
        tokenB: row.token_b,
        liquidity_usd: (0, number_1.toNumber)(row.liquidity_usd) ?? 0,
        apy: (0, number_1.toNumber)(row.apy) ?? 0,
        volume_24h: (0, number_1.toNumber)(row.volume_24h) ?? 0,
        last_updated: (0, time_1.toTimestamp)(row.last_updated) ?? Date.now()
    };
};
async function upsertPools(pools) {
    if (pools.length === 0)
        return;
    const rows = pools.map((pool) => ({
        dex: pool.dex,
        pool_id: pool.pool_id ?? null,
        token_a: pool.tokenA,
        token_b: pool.tokenB,
        liquidity_usd: pool.liquidity_usd,
        apy: pool.apy,
        volume_24h: pool.volume_24h,
        last_updated: new Date(pool.last_updated).toISOString()
    }));
    const { error: modernError } = await supabase_1.supabase
        .from("pools")
        .upsert(rows, { onConflict: "dex,pool_id" });
    if (!modernError)
        return;
    if (modernError.code === "42501") {
        console.error("[db] pools upsert blocked by RLS (code 42501). Configure Supabase policy for INSERT/UPDATE on pools, or run this backend with service_role key.");
        throw modernError;
    }
    if ((0, retry_1.isTransientError)(modernError)) {
        throw modernError;
    }
    console.warn(`[db] modern pool upsert failed; falling back to legacy key. reason=${modernError.message}`);
    for (const row of rows) {
        const { error: legacyError } = await supabase_1.supabase
            .from("pools")
            .upsert(row, { onConflict: "dex,token_a,token_b" });
        if (legacyError) {
            if (legacyError.code === "42501") {
                console.error("[db] legacy pools upsert blocked by RLS (code 42501). Configure Supabase policy for INSERT/UPDATE on pools, or run this backend with service_role key.");
            }
            throw legacyError;
        }
    }
}
async function fetchPools() {
    const { data, error } = await supabase_1.supabase.from("pools").select("*");
    if (error) {
        throw error;
    }
    return (data ?? []).map((row) => mapRowToPool(row));
}
async function fetchPoolsByDex(dex) {
    const { data, error } = await supabase_1.supabase.from("pools").select("*").eq("dex", dex);
    if (error) {
        throw error;
    }
    return (data ?? []).map((row) => mapRowToPool(row));
}
async function fetchTopPoolsByApy(limit = 10) {
    const { data, error } = await supabase_1.supabase
        .from("pools")
        .select("*")
        .order("apy", { ascending: false })
        .limit(limit);
    if (error) {
        throw error;
    }
    return (data ?? []).map((row) => mapRowToPool(row));
}
