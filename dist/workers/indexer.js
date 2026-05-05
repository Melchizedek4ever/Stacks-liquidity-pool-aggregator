"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startIndexer = startIndexer;
const node_cron_1 = __importDefault(require("node-cron"));
const aggregator_1 = require("../services/aggregator");
const ranking_1 = require("../services/ranking");
const savePools_1 = require("../services/savePools");
const validatePool_1 = require("../utils/validatePool");
const DEFAULT_CRON = "*/1 * * * *";
const DISPLAY_THRESHOLD = (() => {
    const raw = process.env.DISPLAY_MIN_SCORE;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed))
        return validatePool_1.DISPLAY_MIN_SCORE;
    if (parsed < 0 || parsed > 100)
        return validatePool_1.DISPLAY_MIN_SCORE;
    return parsed;
})();
function startIndexer() {
    if (process.env.DISABLE_INDEXER === "true") {
        console.info("Indexer disabled");
        return;
    }
    const schedule = process.env.INDEXER_CRON || DEFAULT_CRON;
    let running = false;
    node_cron_1.default.schedule(schedule, async () => {
        if (running) {
            console.warn("Indexer is already running, skipping this tick");
            return;
        }
        running = true;
        try {
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
                rejection_rate: aggregation.fetched > 0
                    ? Number((aggregation.rejected / aggregation.fetched).toFixed(4))
                    : 0
            }));
        }
        catch (error) {
            console.error("Indexer run failed", error);
        }
        finally {
            running = false;
        }
    });
}
