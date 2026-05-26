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
        const normalizedPool = { ...pool, pool_id: createPoolId(pool) };
        const existing = map.get(normalizedPool.pool_id);
        map.set(normalizedPool.pool_id, existing ? choosePoolForBatch(existing, normalizedPool) : normalizedPool);
        return map;
    }, new Map());
    return Array.from(poolMap.values());
}
async function savePools(input) {
    const { eligible, displayed } = input;
    if (eligible.length === 0) {
        console.info(JSON.stringify({ event: "pools_persist_skipped", reason: "empty_batch" }));
        return { eligible_persisted: 0, displayed_persisted: 0 };
    }
    const deduped = deduplicatePoolsByPoolId(eligible);
    const duplicateCount = eligible.length - deduped.length;
    // Mark each pool with its display status in one pass — no second upsert needed.
    const displayedIds = new Set(displayed.map((p) => createPoolId(p)));
    const batch = deduped.map((pool) => ({
        ...pool,
        is_displayed: displayedIds.has(pool.pool_id),
    }));
    console.info(JSON.stringify({
        event: "pools_deduplicated",
        eligible_input_count: eligible.length,
        eligible_duplicate_count: duplicateCount,
        eligible_output_count: deduped.length,
        displayed_count: displayedIds.size,
    }));
    try {
        await (0, retry_1.withRetry)(() => (0, pools_1.upsertPools)(batch), {
            operationName: "supabase pools upsert",
            retries: 4,
            minDelayMs: 1_000,
            maxDelayMs: 8_000,
        });
        const displayedPersisted = batch.filter((p) => p.is_displayed).length;
        console.info(JSON.stringify({
            event: "pools_persisted",
            eligible_persisted: batch.length,
            displayed_persisted: displayedPersisted,
        }));
        return { eligible_persisted: batch.length, displayed_persisted: displayedPersisted };
    }
    catch (error) {
        console.error(JSON.stringify({
            event: "pools_persist_failed",
            attempted: batch.length,
            error: getErrorMessage(error),
        }));
        return { eligible_persisted: 0, displayed_persisted: 0 };
    }
}
