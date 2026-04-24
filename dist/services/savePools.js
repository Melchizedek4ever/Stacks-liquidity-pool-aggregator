"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePools = savePools;
const pools_1 = require("../db/pools");
async function savePools(pools) {
    if (pools.length === 0) {
        console.info("No pools to persist");
        return;
    }
    // Deduplicate by pool_id when present; fallback to pair key for pools without pool_id.
    const poolMap = new Map();
    for (const pool of pools) {
        const key = pool.pool_id
            ? `pool-id:${pool.pool_id}`
            : `pair:${pool.dex}:${pool.tokenA}:${pool.tokenB}`;
        const existing = poolMap.get(key);
        if (!existing) {
            poolMap.set(key, pool);
        }
    }
    const deduped = Array.from(poolMap.values());
    console.info(`Deduped ${pools.length} pools → ${deduped.length} unique pools`);
    try {
        await (0, pools_1.upsertPools)(deduped);
        console.info(`Persisted ${deduped.length} pools`);
    }
    catch (error) {
        console.error("Failed to persist pools", error);
    }
}
