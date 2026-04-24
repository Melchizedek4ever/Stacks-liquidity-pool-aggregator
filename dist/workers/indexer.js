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
const DEFAULT_CRON = "*/1 * * * *";
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
            const pools = await (0, aggregator_1.aggregatePools)();
            const ranked = (0, ranking_1.rankPools)(pools);
            await (0, savePools_1.savePools)(pools);
            console.info(`Indexed ${pools.length} pools, ranked ${ranked.length}`);
        }
        catch (error) {
            console.error("Indexer run failed", error);
        }
        finally {
            running = false;
        }
    });
}
