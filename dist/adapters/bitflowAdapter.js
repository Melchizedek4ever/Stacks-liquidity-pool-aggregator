"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bitflowAdapter = void 0;
const retry_1 = require("../utils/retry");
const number_1 = require("../utils/number");
const time_1 = require("../utils/time");
const BITFLOW_PUBLIC_API_URL = process.env.BITFLOW_PUBLIC_API_URL ||
    "https://bitflow-sdk-api-gateway-7owjsmt8.uc.gateway.dev";
const BITFLOW_API_KEY = process.env.BITFLOW_API_KEY;
const isDev = process.env.NODE_ENV !== "production";
const includeRawPoolData = process.env.INCLUDE_RAW_POOL_DATA === "true";
const previewPayload = process.env.BITFLOW_PREVIEW_PAYLOAD === "true";
function getMockPools() {
    return [
        {
            dex: "bitflow",
            pool_id: "mock:bitflow:stx-sbtc",
            tokenA: "STX",
            tokenB: "sBTC",
            liquidity_usd: 1_250_000,
            apy: 0,
            volume_24h: 75_000,
            last_updated: Date.now(),
            source: "mock"
        },
        {
            dex: "bitflow",
            pool_id: "mock:bitflow:stx-usda",
            tokenA: "STX",
            tokenB: "USDA",
            liquidity_usd: 850_000,
            apy: 0,
            volume_24h: 42_000,
            last_updated: Date.now(),
            source: "mock"
        }
    ];
}
function previewRawPayload(label, payload) {
    if (!previewPayload)
        return;
    console.log(`\n[bitflow] RAW PAYLOAD FROM ${label}`);
    console.dir(payload, { depth: 5, maxArrayLength: 20 });
    console.log(`[bitflow] END PAYLOAD ${label}\n`);
}
function logNormalizationSummary(stats) {
    console.info(JSON.stringify({
        event: "adapter_normalization_summary",
        dex: "bitflow",
        ...stats
    }));
}
function normalizeBitflowToken(value) {
    if (typeof value !== "string")
        return "";
    const trimmed = value.trim();
    if (!trimmed)
        return "";
    if (trimmed === "Stacks")
        return "STX";
    return trimmed;
}
function normalizeBitflowPools(payload) {
    const candidates = [
        payload,
        payload?.data,
        payload?.pools,
        payload?.data?.pools,
        payload?.results
    ];
    for (const candidate of candidates) {
        if (!Array.isArray(candidate))
            continue;
        const stats = {
            rows_seen: candidate.length,
            rows_normalized: 0,
            missing_pool_id: 0,
            missing_token_fields: 0,
            invalid_liquidity_usd: 0,
            invalid_volume_24h: 0
        };
        const pools = [];
        for (const row of candidate) {
            if (!row || typeof row !== "object")
                continue;
            const item = row;
            const tokenA = normalizeBitflowToken(item.base_currency);
            const tokenB = normalizeBitflowToken(item.target_currency);
            const poolId = typeof item.pool_id === "string" ? item.pool_id.trim() : "";
            const liquidity = (0, number_1.toNumber)(item.liquidity_in_usd);
            const volume = (0, number_1.toNumber)(item.base_volume);
            const tradeTimeSeconds = (0, number_1.toNumber)(item.last_trade_time);
            const resolvedTime = tradeTimeSeconds
                ? (0, time_1.toTimestamp)(tradeTimeSeconds * 1000) ?? Date.now()
                : Date.now();
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
            if (volume === null) {
                stats.invalid_volume_24h += 1;
                normalizationFlags.push("invalid_format:volume_24h");
            }
            pools.push({
                dex: "bitflow",
                pool_id: poolId,
                tokenA,
                tokenB,
                liquidity_usd: liquidity,
                apy: 0,
                volume_24h: volume,
                last_trade_time: resolvedTime,
                last_updated: resolvedTime,
                normalization_flags: normalizationFlags.length ? normalizationFlags : undefined,
                raw_data: includeRawPoolData ? item : undefined
            });
            stats.rows_normalized += 1;
        }
        logNormalizationSummary(stats);
        if (pools.length > 0)
            return pools;
    }
    return [];
}
async function fetchCandidate(url) {
    let urlWithApiKey = url;
    if (BITFLOW_API_KEY) {
        urlWithApiKey = url.includes("?")
            ? `${url}&api_key=${BITFLOW_API_KEY}`
            : `${url}?api_key=${BITFLOW_API_KEY}`;
    }
    console.log(`[bitflow] requesting ${urlWithApiKey}`);
    try {
        const payload = await (0, retry_1.fetchJsonWithRetry)(urlWithApiKey);
        previewRawPayload(urlWithApiKey, payload);
        const pools = normalizeBitflowPools(payload);
        if (pools.length > 0) {
            console.log(`[bitflow] ${url} returned 200 OK`);
            console.log(`[bitflow] normalized ${pools.length} pools`);
            return {
                pools,
                meta: { url, status: 200, ok: true }
            };
        }
        console.warn(`[bitflow] ${url} returned 200 but payload was not usable`);
        return {
            pools: [],
            meta: {
                url,
                status: 200,
                ok: false,
                error: "Payload not usable for pool normalization"
            }
        };
    }
    catch (error) {
        const message = error?.message || String(error);
        const statusMatch = message.match(/\b(\d{3})\b/);
        const status = statusMatch ? Number(statusMatch[1]) : undefined;
        if (status) {
            console.warn(`[bitflow] ${url} returned ${status}`);
        }
        else {
            console.warn(`[bitflow] request failed for ${url}: ${message}`);
        }
        return {
            pools: [],
            meta: {
                url,
                status,
                ok: false,
                error: message
            }
        };
    }
}
exports.bitflowAdapter = {
    name: "bitflow",
    async fetchPools() {
        const candidates = [`${BITFLOW_PUBLIC_API_URL}/ticker`];
        const attempted = [];
        for (const url of candidates) {
            const { pools, meta } = await fetchCandidate(url);
            attempted.push(meta);
            if (pools.length > 0)
                return pools;
        }
        if (isDev) {
            console.warn("[bitflow] all endpoint candidates failed or were unusable; using mock data fallback");
            const mockPools = getMockPools();
            console.log(`[bitflow] returning ${mockPools.length} mock pools`);
            return mockPools;
        }
        console.warn("[bitflow] no pools returned from any candidate endpoint");
        console.warn(`[bitflow] attempted endpoints: ${JSON.stringify(attempted)}`);
        return [];
    }
};
