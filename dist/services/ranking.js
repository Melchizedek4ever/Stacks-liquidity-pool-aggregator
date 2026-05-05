"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankPools = rankPools;
const validatePool_1 = require("../utils/validatePool");
const tokenResolver_1 = require("./tokenResolver");
const RECENCY_HALF_LIFE_HOURS = Number(process.env.RECENCY_HALF_LIFE_HOURS ?? 6);
const clamp01 = (value) => Math.max(0, Math.min(1, value));
function logScore(value, maxValue) {
    if (!Number.isFinite(value) || value <= 0 || maxValue <= 0)
        return 0;
    return clamp01(Math.log1p(value) / Math.log1p(maxValue));
}
function recencyScore(pool, now) {
    const ageMs = Math.max(0, now - (0, validatePool_1.getPoolLastTradeTime)(pool));
    const ageHours = ageMs / (60 * 60 * 1000);
    const score = Math.pow(0.5, ageHours / RECENCY_HALF_LIFE_HOURS);
    return clamp01(score);
}
function tokenScore(pool) {
    const tokenAVerified = pool.tokenA_verified ?? (0, tokenResolver_1.isVerifiedToken)(pool.tokenA);
    const tokenBVerified = pool.tokenB_verified ?? (0, tokenResolver_1.isVerifiedToken)(pool.tokenB);
    const scoreA = tokenAVerified ? 1 : 0.5;
    const scoreB = tokenBVerified ? 1 : 0.5;
    return (scoreA + scoreB) / 2;
}
function rankPools(pools, now = Date.now()) {
    if (pools.length === 0)
        return [];
    const maxLiquidity = Math.max(...pools.map((pool) => pool.liquidity_usd), 0);
    const maxVolume = Math.max(...pools.map((pool) => pool.volume_24h), 0);
    const staleMs = validatePool_1.MAX_STALE_HOURS * 60 * 60 * 1000;
    return pools
        .map((pool) => {
        const liquidity_score = logScore(pool.liquidity_usd, maxLiquidity);
        const volume_score = logScore(pool.volume_24h, maxVolume);
        const recency_score = recencyScore(pool, now);
        const token_quality_score = tokenScore(pool);
        const score = clamp01(liquidity_score * volume_score * recency_score * token_quality_score);
        const flags = {
            is_verified_pair: (pool.tokenA_verified ?? (0, tokenResolver_1.isVerifiedToken)(pool.tokenA)) &&
                (pool.tokenB_verified ?? (0, tokenResolver_1.isVerifiedToken)(pool.tokenB)),
            is_stale: now - (0, validatePool_1.getPoolLastTradeTime)(pool) > staleMs,
            is_low_liquidity: pool.liquidity_usd < validatePool_1.MIN_LIQUIDITY_USD
        };
        return {
            ...pool,
            score,
            confidence: score,
            flags,
            component_scores: {
                liquidity_score,
                volume_score,
                recency_score,
                token_quality_score
            }
        };
    })
        .sort((a, b) => b.score - a.score);
}
