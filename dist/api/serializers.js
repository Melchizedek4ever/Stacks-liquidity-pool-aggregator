"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRankedPoolResponse = exports.toPoolResponse = void 0;
const toPoolResponse = (pool) => ({
    dex: pool.dex,
    token_a: pool.tokenA,
    token_b: pool.tokenB,
    liquidity_usd: pool.liquidity_usd,
    apy: pool.apy,
    volume_24h: pool.volume_24h,
    last_updated: pool.last_updated
});
exports.toPoolResponse = toPoolResponse;
const toRankedPoolResponse = (pool) => ({
    ...(0, exports.toPoolResponse)(pool),
    score: pool.score
});
exports.toRankedPoolResponse = toRankedPoolResponse;
