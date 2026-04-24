"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregatePools = aggregatePools;
const adapters_1 = require("../adapters");
const tokenResolver_1 = require("./tokenResolver");
const validatePool_1 = require("../utils/validatePool");
async function aggregatePools() {
    const settledResults = await Promise.allSettled(adapters_1.dexAdapters.map((adapter) => adapter.fetchPools()));
    const collected = [];
    for (let i = 0; i < settledResults.length; i++) {
        const result = settledResults[i];
        const adapterName = adapters_1.dexAdapters[i].name;
        if (result.status !== "fulfilled") {
            console.error(`[aggregator] Adapter failed: ${adapterName}`);
            console.error(result.reason);
            continue;
        }
        const pools = result.value;
        for (const pool of pools) {
            try {
                if (!pool.tokenA || !pool.tokenB) {
                    console.warn(`[aggregator] Filtered pool (${adapterName}) pool_id=${pool.pool_id ?? "n/a"} reason=missing tokenA or tokenB tokenA=${String(pool.tokenA)} tokenB=${String(pool.tokenB)}`);
                    continue;
                }
                const tokenA = await (0, tokenResolver_1.resolveToken)(pool.tokenA);
                const tokenB = await (0, tokenResolver_1.resolveToken)(pool.tokenB);
                if (!tokenA || !tokenB) {
                    console.warn(`[aggregator] Filtered pool (${adapterName}) pool_id=${pool.pool_id ?? "n/a"} reason=unknown token tokenA=${pool.tokenA} tokenB=${pool.tokenB}`);
                    continue;
                }
                const normalizedPool = {
                    ...pool,
                    tokenA: tokenA.id,
                    tokenB: tokenB.id,
                };
                const reason = (0, validatePool_1.getPoolValidationReason)(normalizedPool);
                if (reason) {
                    console.warn(`[aggregator] Filtered pool (${adapterName}) pool_id=${normalizedPool.pool_id ?? "n/a"} reason=${reason} tokenA=${normalizedPool.tokenA} tokenB=${normalizedPool.tokenB} liquidity_usd=${normalizedPool.liquidity_usd}`);
                    continue;
                }
                collected.push(normalizedPool);
            }
            catch (err) {
                console.error("[aggregator] Pool normalization error:", err);
            }
        }
    }
    (0, tokenResolver_1.logUnknownTokens)();
    console.info(`[aggregator] ${collected.length} pools passed validation`);
    return collected;
}
