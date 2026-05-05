"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../config");
const aggregator_1 = require("../services/aggregator");
const ranking_1 = require("../services/ranking");
const savePools_1 = require("../services/savePools");
const validatePool_1 = require("../utils/validatePool");
const DISPLAY_THRESHOLD = (() => {
    const raw = process.env.DISPLAY_MIN_SCORE;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed))
        return validatePool_1.DISPLAY_MIN_SCORE;
    if (parsed < 0 || parsed > 100)
        return validatePool_1.DISPLAY_MIN_SCORE;
    return parsed;
})();
async function run() {
    const aggregation = await (0, aggregator_1.aggregatePools)();
    const ranked = (0, ranking_1.rankPools)(aggregation.pools);
    const eligiblePools = ranked;
    console.debug(JSON.stringify({
        event: "ranking_score_snapshot",
        pools: ranked.map((pool) => ({
            pool_id: pool.pool_id,
            validation_score: pool.validation_score,
            final_score: pool.score
        }))
    }));
    console.debug(JSON.stringify({ event: "display_threshold", value: DISPLAY_THRESHOLD }));
    let displayedPools = eligiblePools.filter((pool) => {
        const passes = pool.score >= DISPLAY_THRESHOLD || (pool.validation_score ?? 0) >= 80;
        if (!passes) {
            console.debug(JSON.stringify({
                event: "display_filtered_out",
                pool_id: pool.pool_id,
                score: pool.score,
                validation_score: pool.validation_score,
                threshold: DISPLAY_THRESHOLD
            }));
        }
        return passes;
    });
    if (displayedPools.length === 0) {
        console.warn(JSON.stringify({
            event: "display_filter_fallback",
            message: "No pools passed display threshold, falling back to top pools",
            fallback_size: Math.min(10, eligiblePools.length)
        }));
        displayedPools = eligiblePools.slice(0, 10);
    }
    const persisted = await (0, savePools_1.savePools)({
        eligible: eligiblePools,
        displayed: displayedPools
    });
    console.info(JSON.stringify({
        event: "display_filtering",
        eligible: eligiblePools.length,
        displayed: displayedPools.length,
        display_threshold: DISPLAY_THRESHOLD
    }));
    console.info(JSON.stringify({
        event: "indexer_run_complete",
        fetched: aggregation.fetched,
        scored: aggregation.scored,
        retained: aggregation.retained,
        rejected: aggregation.rejected,
        ranked: ranked.length,
        eligible: eligiblePools.length,
        displayed: displayedPools.length,
        eligible_persisted: persisted.eligible_persisted,
        displayed_persisted: persisted.displayed_persisted,
        rejection_rate: aggregation.fetched > 0 ? Number((aggregation.rejected / aggregation.fetched).toFixed(4)) : 0
    }));
}
run().catch((error) => {
    console.error(error);
    process.exit(1);
});
