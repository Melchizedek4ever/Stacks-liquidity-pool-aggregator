"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deduplicatePoolsByPoolId = deduplicatePoolsByPoolId;
exports.savePools = savePools;
const pools_1 = require("../db/pools");
const retry_1 = require("../utils/retry");
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    if (error && typeof error === "object") {
        const message = error.message;
        if (typeof message === "string")
            return message;
    }
    return String(error);
}
function createPoolId(pool) {
    if (pool.pool_id?.trim())
        return pool.pool_id.trim();
    return `${pool.dex}:${pool.tokenA}:${pool.tokenB}`.toLowerCase();
}
function choosePoolForBatch(existing, incoming) {
    const existingTime = existing.last_trade_time ?? existing.last_updated;
    const incomingTime = incoming.last_trade_time ?? incoming.last_updated;
    if (incomingTime > existingTime)
        return incoming;
    if (incomingTime === existingTime &&
        (incoming.liquidity_usd ?? 0) > (existing.liquidity_usd ?? 0)) {
        return incoming;
    }
    return existing;
}
function deduplicatePoolsByPoolId(pools) {
    const poolMap = pools.reduce((map, pool) => {
        const normalizedPool = {
            ...pool,
            pool_id: createPoolId(pool)
        };
        const existing = map.get(normalizedPool.pool_id);
        map.set(normalizedPool.pool_id, existing ? choosePoolForBatch(existing, normalizedPool) : normalizedPool);
        return map;
    }, new Map());
    return Array.from(poolMap.values());
}
async function savePools(pools) {
    if (pools.length === 0) {
        console.info(JSON.stringify({ event: "pools_persist_skipped", reason: "empty_batch" }));
        return 0;
    }
    const deduped = deduplicatePoolsByPoolId(pools);
    const duplicateCount = pools.length - deduped.length;
    console.info(JSON.stringify({
        event: "pools_deduplicated",
        input_count: pools.length,
        duplicate_count: duplicateCount,
        output_count: deduped.length
    }));
    try {
        await (0, retry_1.withRetry)(() => (0, pools_1.upsertPools)(deduped), {
            operationName: "supabase pools upsert",
            retries: 4,
            minDelayMs: 1_000,
            maxDelayMs: 8_000
        });
        console.info(JSON.stringify({
            event: "pools_persisted",
            persisted: deduped.length
        }));
        return deduped.length;
    }
    catch (error) {
        console.error(JSON.stringify({
            event: "pools_persist_failed",
            attempted: deduped.length,
            error: getErrorMessage(error)
        }));
        return 0;
    }
}
