"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRankedPoolResponse = exports.toPoolResponse = void 0;
const toPoolResponse = (pool) => ({
    pool_id: pool.pool_id,
    dex: pool.dex,
    token_a: pool.tokenA,
    token_b: pool.tokenB,
    token_a_symbol: pool.tokenA_symbol,
    token_b_symbol: pool.tokenB_symbol,
    token_a_verified: pool.tokenA_verified,
    token_b_verified: pool.tokenB_verified,
    liquidity_usd: pool.liquidity_usd,
    apy: pool.apy,
    volume_24h: pool.volume_24h,
    last_trade_time: pool.last_trade_time,
    last_updated: pool.last_updated
});
exports.toPoolResponse = toPoolResponse;
const toRankedPoolResponse = (pool) => ({
    ...(0, exports.toPoolResponse)(pool),
    score: pool.score,
    confidence: pool.confidence,
    flags: pool.flags,
    component_scores: pool.component_scores
});
exports.toRankedPoolResponse = toRankedPoolResponse;
