"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPoolArray = void 0;
exports.mapAdapterPools = mapAdapterPools;
const number_1 = require("../utils/number");
const time_1 = require("../utils/time");
const includeRawPoolData = process.env.INCLUDE_RAW_POOL_DATA === "true";
function logNormalizationSummary(dex, stats) {
    console.info(JSON.stringify({
        event: "adapter_normalization_summary",
        dex,
        ...stats
    }));
}
const toPoolArray = (data) => {
    if (Array.isArray(data))
        return data;
    if (data && typeof data === "object") {
        const record = data;
        if (Array.isArray(record.pools))
            return record.pools;
        if (Array.isArray(record.data))
            return record.data;
        if (Array.isArray(record.results))
            return record.results;
    }
    return [];
};
exports.toPoolArray = toPoolArray;
function mapAdapterPools(rawPools, dex, mapper) {
    const pools = [];
    const stats = {
        rows_seen: rawPools.length,
        rows_normalized: 0,
        rows_skipped_invalid_shape: 0,
        missing_pool_id: 0,
        missing_token_fields: 0,
        invalid_liquidity_usd: 0,
        invalid_apy: 0,
        invalid_volume_24h: 0
    };
    for (const raw of rawPools) {
        if (!raw || typeof raw !== "object") {
            stats.rows_skipped_invalid_shape += 1;
            continue;
        }
        const mapped = mapper(raw);
        const tokenA = typeof mapped.tokenA === "string" ? mapped.tokenA.trim() : "";
        const tokenB = typeof mapped.tokenB === "string" ? mapped.tokenB.trim() : "";
        const liquidity = (0, number_1.toNumber)(mapped.liquidity_usd);
        const apy = (0, number_1.toNumber)(mapped.apy);
        const volume = (0, number_1.toNumber)(mapped.volume_24h);
        const lastUpdated = (0, time_1.toTimestamp)(mapped.last_updated) ?? Date.now();
        const lastTradeTime = (0, time_1.toTimestamp)(mapped.last_trade_time) ?? lastUpdated;
        const feeBps = (0, number_1.toNumber)(mapped.fee_bps);
        const poolId = typeof mapped.pool_id === "string" ? mapped.pool_id.trim() : "";
        const normalizationFlags = [];
        if (!poolId) {
            stats.missing_pool_id += 1;
            normalizationFlags.push("missing_pool_id");
        }
        if (!tokenA || !tokenB) {
            stats.missing_token_fields += 1;
            normalizationFlags.push("missing_token");
        }
        if (liquidity === null) {
            stats.invalid_liquidity_usd += 1;
            normalizationFlags.push("invalid_format:liquidity_usd");
        }
        if (apy === null) {
            stats.invalid_apy += 1;
            normalizationFlags.push("invalid_format:apy");
        }
        if (volume === null) {
            stats.invalid_volume_24h += 1;
            normalizationFlags.push("invalid_format:volume_24h");
        }
        pools.push({
            dex,
            pool_id: poolId,
            tokenA,
            tokenB,
            liquidity_usd: liquidity,
            apy,
            volume_24h: volume,
            fee_bps: feeBps,
            last_trade_time: lastTradeTime,
            last_updated: lastUpdated,
            normalization_flags: normalizationFlags.length ? normalizationFlags : undefined,
            raw_data: includeRawPoolData ? raw : undefined
        });
        stats.rows_normalized += 1;
    }
    logNormalizationSummary(dex, stats);
    return pools;
}
