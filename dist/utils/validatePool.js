"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_VALIDATION_SCORE = exports.MAX_STALE_HOURS = exports.MIN_VOLUME_24H_USD = exports.MIN_LIQUIDITY_USD = void 0;
exports.getPoolLastTradeTime = getPoolLastTradeTime;
exports.assessPoolValidation = assessPoolValidation;
exports.shouldKeepPoolForRanking = shouldKeepPoolForRanking;
exports.shouldKeepPoolByScore = shouldKeepPoolByScore;
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
const maxStaleMs = exports.MAX_STALE_HOURS * 60 * 60 * 1000;
const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));
function getPoolLastTradeTime(pool) {
    return pool.last_trade_time ?? pool.last_updated;
}
function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}
function assessPoolValidation(pool, now = Date.now()) {
    const flags = new Set(pool.normalization_flags ?? []);
    const criticalReasons = [];
    let score = 100;
    if (!pool.tokenA || !pool.tokenB) {
        flags.add("missing_token");
        criticalReasons.push("missing_token");
    }
    if (!pool.pool_id?.trim()) {
        flags.add("invalid_pool_id");
        criticalReasons.push("invalid_pool_id");
    }
    if (pool.apy === null || !isFiniteNumber(pool.apy)) {
        flags.add("missing_apy");
        score -= 10;
    }
    if (pool.liquidity_usd === null || !isFiniteNumber(pool.liquidity_usd)) {
        flags.add("invalid_format:liquidity_usd");
        score -= 30;
    }
    else if (pool.liquidity_usd < exports.MIN_LIQUIDITY_USD) {
        flags.add("low_liquidity");
        score -= 20;
    }
    if (pool.volume_24h === null || !isFiniteNumber(pool.volume_24h)) {
        flags.add("invalid_format:volume_24h");
        score -= 20;
    }
    else if (pool.volume_24h < exports.MIN_VOLUME_24H_USD) {
        flags.add("low_volume");
        score -= 15;
    }
    if (!isFiniteNumber(pool.last_updated)) {
        flags.add("invalid_format:last_updated");
        score -= 30;
    }
    const lastTradeTime = getPoolLastTradeTime(pool);
    if (!isFiniteNumber(lastTradeTime)) {
        flags.add("invalid_format:last_trade_time");
        score -= 20;
    }
    else if (now - lastTradeTime > maxStaleMs) {
        flags.add("stale_data");
        score -= 15;
    }
    return {
        validation_score: clampScore(score),
        validation_flags: [...flags],
        critical_reasons: criticalReasons,
        is_critical_failure: criticalReasons.length > 0
    };
}
function shouldKeepPoolForRanking(result) {
    return !result.is_critical_failure;
}
function shouldKeepPoolByScore(result, minScore = exports.MIN_VALIDATION_SCORE) {
    return !result.is_critical_failure && result.validation_score >= minScore;
}
// Compatibility helpers used by legacy call-sites.
function getPoolValidationReason(pool, now = Date.now()) {
    const result = assessPoolValidation(pool, now);
    if (result.critical_reasons.length > 0)
        return result.critical_reasons.join(",");
    return result.validation_flags[0] ?? null;
}
function validatePool(pool) {
    return shouldKeepPoolByScore(assessPoolValidation(pool));
}
