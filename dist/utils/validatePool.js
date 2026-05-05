"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISPLAY_MIN_SCORE = exports.MIN_VALIDATION_SCORE = exports.MAX_STALE_HOURS = exports.MIN_VOLUME_24H_USD = exports.MIN_LIQUIDITY_USD = void 0;
exports.getPoolLastTradeTime = getPoolLastTradeTime;
exports.getQualityTier = getQualityTier;
exports.assessPoolValidation = assessPoolValidation;
exports.shouldKeepPoolForRanking = shouldKeepPoolForRanking;
exports.shouldDisplayPool = shouldDisplayPool;
exports.getPoolValidationReason = getPoolValidationReason;
exports.validatePool = validatePool;
const numberFromEnv = (name, fallback) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) ? value : fallback;
};
const qualityMode = process.env.POOL_QUALITY_MODE?.toLowerCase();
exports.MIN_LIQUIDITY_USD = numberFromEnv("MIN_LIQUIDITY_USD", qualityMode === "high" ? 5_000 : 1_000);
exports.MIN_VOLUME_24H_USD = numberFromEnv("MIN_VOLUME_24H_USD", 100);
exports.MAX_STALE_HOURS = numberFromEnv("MAX_STALE_HOURS", 24);
exports.MIN_VALIDATION_SCORE = numberFromEnv("MIN_VALIDATION_SCORE", 50);
exports.DISPLAY_MIN_SCORE = numberFromEnv("DISPLAY_MIN_SCORE", 65);
const maxStaleMs = exports.MAX_STALE_HOURS * 60 * 60 * 1000;
const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));
function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}
function getPoolLastTradeTime(pool) {
    return pool.last_trade_time ?? pool.last_updated;
}
function getQualityTier(score) {
    if (score >= 80)
        return "high";
    if (score >= 65)
        return "medium";
    if (score >= 50)
        return "low";
    return "junk";
}
function assessPoolValidation(pool, now = Date.now()) {
    const flags = new Set();
    const hardRejectionReasons = [];
    let score = 100;
    if (!pool.tokenA || !pool.tokenB) {
        hardRejectionReasons.push("missing_token");
    }
    if (!pool.pool_id?.trim()) {
        hardRejectionReasons.push("invalid_pool_id");
    }
    if (!isFiniteNumber(pool.last_updated)) {
        hardRejectionReasons.push("invalid_structure:last_updated");
    }
    if (pool.apy === null || !isFiniteNumber(pool.apy)) {
        flags.add("missing_apy");
        score -= 10;
    }
    if (pool.liquidity_usd === null || !isFiniteNumber(pool.liquidity_usd)) {
        flags.add("invalid_format:liquidity_usd");
        score -= 25;
    }
    else if (pool.liquidity_usd < exports.MIN_LIQUIDITY_USD) {
        flags.add("low_liquidity");
        score -= 20;
    }
    if (pool.volume_24h === null || !isFiniteNumber(pool.volume_24h)) {
        flags.add("invalid_format:volume_24h");
        score -= 15;
    }
    else if (pool.volume_24h < exports.MIN_VOLUME_24H_USD) {
        flags.add("low_volume");
        score -= 15;
    }
    const lastTradeTime = getPoolLastTradeTime(pool);
    if (!isFiniteNumber(lastTradeTime)) {
        flags.add("invalid_format:last_trade_time");
        score -= 10;
    }
    else if (now - lastTradeTime > maxStaleMs) {
        flags.add("stale_data");
        score -= 15;
    }
    return {
        score: clampScore(score),
        flags: [...flags],
        is_rejected: hardRejectionReasons.length > 0,
        hard_rejection_reasons: hardRejectionReasons.length ? hardRejectionReasons : undefined
    };
}
function shouldKeepPoolForRanking(validation) {
    return !validation.is_rejected;
}
function shouldDisplayPool(score) {
    return score >= exports.DISPLAY_MIN_SCORE;
}
// Legacy compatibility helpers.
function getPoolValidationReason(pool, now = Date.now()) {
    const result = assessPoolValidation(pool, now);
    if (result.is_rejected) {
        return result.hard_rejection_reasons?.join(",") ?? "rejected";
    }
    return result.flags[0] ?? null;
}
function validatePool(pool) {
    const result = assessPoolValidation(pool);
    return !result.is_rejected && result.score >= exports.MIN_VALIDATION_SCORE;
}
