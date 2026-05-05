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
async function savePools(input) {
    const { eligible, displayed } = input;
    if (eligible.length === 0) {
        console.info(JSON.stringify({ event: "pools_persist_skipped", reason: "empty_batch" }));
        return { eligible_persisted: 0, displayed_persisted: 0 };
    }
    const dedupedEligible = deduplicatePoolsByPoolId(eligible);
    const eligibleDuplicateCount = eligible.length - dedupedEligible.length;
    const dedupedDisplayed = deduplicatePoolsByPoolId(displayed);
    const displayedDuplicateCount = displayed.length - dedupedDisplayed.length;
    console.info(JSON.stringify({
        event: "pools_deduplicated",
        eligible_input_count: eligible.length,
        eligible_duplicate_count: eligibleDuplicateCount,
        eligible_output_count: dedupedEligible.length,
        displayed_input_count: displayed.length,
        displayed_duplicate_count: displayedDuplicateCount,
        displayed_output_count: dedupedDisplayed.length
    }));
    try {
        await (0, retry_1.withRetry)(() => (0, pools_1.upsertPools)(dedupedEligible), {
            operationName: "supabase eligible pools upsert",
            retries: 4,
            minDelayMs: 1_000,
            maxDelayMs: 8_000
        });
        if (dedupedDisplayed.length > 0) {
            await (0, retry_1.withRetry)(() => (0, pools_1.upsertPools)(dedupedDisplayed), {
                operationName: "supabase displayed pools upsert",
                retries: 4,
                minDelayMs: 1_000,
                maxDelayMs: 8_000
            });
        }
        console.info(JSON.stringify({
            event: "pools_persisted",
            eligible_persisted: dedupedEligible.length,
            displayed_persisted: dedupedDisplayed.length
        }));
        return {
            eligible_persisted: dedupedEligible.length,
            displayed_persisted: dedupedDisplayed.length
        };
    }
    catch (error) {
        console.error(JSON.stringify({
            event: "pools_persist_failed",
            attempted_eligible: dedupedEligible.length,
            attempted_displayed: dedupedDisplayed.length,
            error: getErrorMessage(error)
        }));
        return { eligible_persisted: 0, displayed_persisted: 0 };
    }
}
