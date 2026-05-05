"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../config");
const aggregator_1 = require("../services/aggregator");
const ranking_1 = require("../services/ranking");
const validatePool_1 = require("../utils/validatePool");
const capturedEvents = [];
const originalInfo = console.info;
const originalWarn = console.warn;
const originalError = console.error;
const capture = (value) => {
    try {
        capturedEvents.push(JSON.parse(String(value)));
    }
    catch {
        // non-JSON logs are ignored for this diagnostic run
    }
};
console.info = (value, ...rest) => {
    capture(value);
    return originalInfo(value, ...rest);
};
console.warn = (value, ...rest) => {
    capture(value);
    return originalWarn(value, ...rest);
};
console.error = (value, ...rest) => {
    capture(value);
    return originalError(value, ...rest);
};
const getEvents = (name) => capturedEvents.filter((event) => event.event === name);
async function run() {
    const aggregation = await (0, aggregator_1.aggregatePools)();
    const ranked = (0, ranking_1.rankPools)(aggregation.pools);
    const eligible = ranked.filter((pool) => (pool.validation_score ?? 0) >= validatePool_1.MIN_VALIDATION_SCORE);
    const summary = {
        event: "diagnostic_pipeline_summary",
        complete: getEvents("aggregation_complete").at(-1) ?? null,
        quality: getEvents("aggregation_quality_summary").at(-1) ?? null,
        rejected: getEvents("pool_rejected").length,
        downgraded: getEvents("pool_downgraded").length,
        adapterHealth: getEvents("adapter_health"),
        ranked: ranked.length,
        eligible: eligible.length
    };
    originalInfo(JSON.stringify(summary, null, 2));
}
run().catch((error) => {
    originalError(error);
    process.exit(1);
});
