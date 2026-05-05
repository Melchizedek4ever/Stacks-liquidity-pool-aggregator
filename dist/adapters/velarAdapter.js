"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.velarAdapter = void 0;
const retry_1 = require("../utils/retry");
const adapterUtils_1 = require("./adapterUtils");
exports.velarAdapter = {
    name: "velar",
    async fetchPools() {
        const VELAR_API_URL = process.env.VELAR_API_URL;
        if (!VELAR_API_URL) {
            console.warn("VELAR_API_URL is not configured; skipping velar adapter");
            return [];
        }
        const data = await (0, retry_1.fetchJsonWithRetry)(VELAR_API_URL, undefined, {
            retries: 3
        });
        const rawPools = (0, adapterUtils_1.toPoolArray)(data);
        return (0, adapterUtils_1.mapAdapterPools)(rawPools, "velar", (raw) => ({
            pool_id: raw.pool_id ?? raw.poolId ?? raw.id,
            tokenA: raw.tokenA ??
                raw.token_a ??
                raw.baseToken ??
                raw.base_token ??
                raw.token0 ??
                raw.base_currency,
            tokenB: raw.tokenB ??
                raw.token_b ??
                raw.quoteToken ??
                raw.quote_token ??
                raw.token1 ??
                raw.target_currency,
            liquidity_usd: raw.liquidity_usd ??
                raw.liquidityUSD ??
                raw.tvl_usd ??
                raw.tvlUsd ??
                raw.liquidity_in_usd,
            apy: raw.apy ?? raw.apr ?? raw.apy_24h ?? raw.apr_24h,
            volume_24h: raw.volume_24h ??
                raw.volume24h ??
                raw.volumeUSD24h ??
                raw.volumeUsd24h ??
                raw.base_volume,
            last_trade_time: raw.last_trade_time ?? raw.lastTradeTime ?? raw.last_trade_at ?? raw.lastTradeAt,
            last_updated: raw.last_updated ??
                raw.lastUpdated ??
                raw.updated_at ??
                raw.updatedAt ??
                raw.last_trade_time ??
                raw.lastTradeTime,
            fee_bps: raw.fee_bps ?? raw.feeBps ?? raw.fee
        }));
    }
};
