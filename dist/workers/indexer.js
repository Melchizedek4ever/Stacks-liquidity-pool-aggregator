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
const RANKING_MIN_SCORE = Number(process.env.RANKING_MIN_VALIDATION_SCORE ?? validatePool_1.MIN_VALIDATION_SCORE);
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
            const eligibleForPersistence = ranked.filter((pool) => (pool.validation_score ?? 0) >= RANKING_MIN_SCORE);
            const persisted = await (0, savePools_1.savePools)(eligibleForPersistence);
            console.info(JSON.stringify({
                event: "indexer_run_complete",
                fetched: aggregation.fetched,
                scored: aggregation.scored,
                retained: aggregation.retained,
                rejected: aggregation.rejected,
                threshold_score: RANKING_MIN_SCORE,
                ranked: ranked.length,
                eligible: eligibleForPersistence.length,
                persisted,
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
