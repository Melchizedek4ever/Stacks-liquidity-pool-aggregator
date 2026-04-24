"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPoolArray = void 0;
exports.mapAdapterPools = mapAdapterPools;
const number_1 = require("../utils/number");
const time_1 = require("../utils/time");
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
    for (const raw of rawPools) {
        if (!raw || typeof raw !== "object")
            continue;
        const mapped = mapper(raw);
        const tokenA = typeof mapped.tokenA === "string" ? mapped.tokenA : "";
        const tokenB = typeof mapped.tokenB === "string" ? mapped.tokenB : "";
        const liquidity = (0, number_1.toNumber)(mapped.liquidity_usd);
        const apy = (0, number_1.toNumber)(mapped.apy);
        const volume = (0, number_1.toNumber)(mapped.volume_24h);
        const lastUpdated = (0, time_1.toTimestamp)(mapped.last_updated) ?? Date.now();
        if (!tokenA || !tokenB || liquidity === null || apy === null || volume === null) {
            continue;
        }
        pools.push({
            dex,
            tokenA,
            tokenB,
            liquidity_usd: liquidity,
            apy,
            volume_24h: volume,
            last_updated: lastUpdated
        });
    }
    return pools;
}
