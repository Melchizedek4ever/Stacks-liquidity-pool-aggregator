"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertPools = upsertPools;
exports.fetchPools = fetchPools;
exports.fetchDisplayedPools = fetchDisplayedPools;
exports.fetchPoolsByDex = fetchPoolsByDex;
exports.fetchTopPoolsByApy = fetchTopPoolsByApy;
const supabase_1 = require("./supabase");
const number_1 = require("../utils/number");
const time_1 = require("../utils/time");
const retry_1 = require("../utils/retry");
const validatePool_1 = require("../utils/validatePool");
const staleMs = validatePool_1.MAX_STALE_HOURS * 60 * 60 * 1000;
const mapRowToPool = (row) => ({
    dex: row.dex,
    pool_id: row.pool_id ?? "",
    tokenA: row.token_a,
    tokenB: row.token_b,
    tokenA_symbol: row.token_a_symbol ?? undefined,
    tokenB_symbol: row.token_b_symbol ?? undefined,
    tokenA_verified: row.token_a_verified ?? undefined,
    tokenB_verified: row.token_b_verified ?? undefined,
    liquidity_usd: (0, number_1.toNumber)(row.liquidity_usd),
    apy: (0, number_1.toNumber)(row.apy),
    volume_24h: (0, number_1.toNumber)(row.volume_24h),
    last_updated: (0, time_1.toTimestamp)(row.last_updated) ?? Date.now(),
    last_trade_time: row.last_trade_time ? (0, time_1.toTimestamp)(row.last_trade_time) ?? undefined : undefined,
    fee_bps: (0, number_1.toNumber)(row.fee_bps) ?? undefined,
    validation_score: (0, number_1.toNumber)(row.validation_score) ?? undefined,
    validation_flags: row.validation_flags ?? undefined,
    quality_tier: row.quality_tier ?? undefined,
    is_displayed: row.is_displayed ?? undefined,
});
const mapRowToRankedPool = (row) => {
    const pool = mapRowToPool(row);
    const score = (0, number_1.toNumber)(row.score) ?? 0;
    const validationScore = pool.validation_score ?? 0;
    const lastTradeTime = pool.last_trade_time ?? pool.last_updated;
    return {
        ...pool,
        score,
        confidence: Number((validationScore / 100).toFixed(2)),
        flags: {
            is_verified_pair: (pool.tokenA_verified ?? false) && (pool.tokenB_verified ?? false),
            is_stale: Date.now() - lastTradeTime > staleMs,
            is_low_liquidity: (pool.liquidity_usd ?? 0) <= 0,
        },
    };
};
async function upsertPools(pools) {
    if (pools.length === 0)
        return;
    const rows = pools.map((pool) => {
        const ranked = pool;
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
        };
    });
    const { error } = await supabase_1.supabase
        .from("pools")
        .upsert(rows, { onConflict: "dex,pool_id" });
    if (!error)
        return;
    if (error.code === "42501") {
        console.error("[db] pools upsert blocked by RLS (code 42501). Use the service_role key or add explicit INSERT/UPDATE policies.");
        throw error;
    }
    if ((0, retry_1.isTransientError)(error)) {
        throw error;
    }
    console.error(`[db] pools upsert failed: ${error.message}`);
    throw error;
}
async function fetchPools() {
    const { data, error } = await supabase_1.supabase.from("pools").select("*");
    if (error)
        throw error;
    return (data ?? []).map((row) => mapRowToPool(row));
}
async function fetchDisplayedPools() {
    const { data, error } = await supabase_1.supabase
        .from("pools")
        .select("*")
        .eq("is_displayed", true)
        .order("score", { ascending: false });
    if (error)
        throw error;
    return (data ?? []).map((row) => mapRowToRankedPool(row));
}
async function fetchPoolsByDex(dex) {
    const { data, error } = await supabase_1.supabase.from("pools").select("*").eq("dex", dex);
    if (error)
        throw error;
    return (data ?? []).map((row) => mapRowToPool(row));
}
async function fetchTopPoolsByApy(limit = 10) {
    const { data, error } = await supabase_1.supabase
        .from("pools")
        .select("*")
        .order("apy", { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return (data ?? []).map((row) => mapRowToPool(row));
}
