"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bitflowAdapter = void 0;
const retry_1 = require("../utils/retry");
const BITFLOW_PUBLIC_API_URL = process.env.BITFLOW_PUBLIC_API_URL ||
    "https://bitflow-sdk-api-gateway-7owjsmt8.uc.gateway.dev";
const BITFLOW_API_KEY = process.env.BITFLOW_API_KEY;
const isDev = process.env.NODE_ENV !== "production";
function getMockPools() {
    return [
        {
            dex: "bitflow",
            tokenA: "STX",
            tokenB: "sBTC",
            liquidity_usd: 1_250_000,
            apy: 0,
            volume_24h: 75_000,
            last_updated: Date.now(),
        },
        {
            dex: "bitflow",
            tokenA: "STX",
            tokenB: "USDA",
            liquidity_usd: 850_000,
            apy: 0,
            volume_24h: 42_000,
            last_updated: Date.now(),
        },
    ];
}
function previewPayload(label, payload) {
    console.log(`\n[bitflow] RAW PAYLOAD FROM ${label}`);
    console.dir(payload, { depth: 5, maxArrayLength: 20 });
    console.log(`[bitflow] END PAYLOAD ${label}\n`);
}
function safeNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}
function normalizeBitflowPools(payload) {
    const candidates = [
        payload,
        payload?.data,
        payload?.pools,
        payload?.data?.pools,
        payload?.results,
    ];
    for (const candidate of candidates) {
        if (!Array.isArray(candidate))
            continue;
        const pools = candidate
            .map((item) => {
            const tokenA = item?.base_currency;
            const tokenB = item?.target_currency;
            if (!tokenA || !tokenB)
                return null;
            return {
                dex: "bitflow",
                pool_id: item?.pool_id,
                tokenA: String(tokenA),
                tokenB: String(tokenB),
                liquidity_usd: safeNumber(item?.liquidity_in_usd, 0),
                // Bitflow ticker doesn't expose APY directly
                apy: 0,
                // Best available proxy for activity right now
                volume_24h: safeNumber(item?.base_volume, 0),
                // Use last trade time if available, else now
                last_updated: item?.last_trade_time
                    ? safeNumber(item.last_trade_time) * 1000
                    : Date.now(),
            };
        })
            .filter((pool) => pool !== null)
            .filter((pool) => pool.liquidity_usd > 0);
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
        previewPayload(urlWithApiKey, payload);
        const pools = normalizeBitflowPools(payload);
        if (pools.length > 0) {
            console.log(`[bitflow] ${url} returned 200 OK`);
            console.log(`[bitflow] normalized ${pools.length} pools`);
            return {
                pools,
                meta: { url, status: 200, ok: true },
            };
        }
        console.warn(`[bitflow] ${url} returned 200 but payload was not usable`);
        return {
            pools: [],
            meta: {
                url,
                status: 200,
                ok: false,
                error: "Payload not usable for pool normalization",
            },
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
                error: message,
            },
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
            if (pools.length > 0) {
                return pools;
            }
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
    },
};
