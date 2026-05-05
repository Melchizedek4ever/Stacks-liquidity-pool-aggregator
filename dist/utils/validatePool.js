"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_STALE_HOURS = exports.MIN_VOLUME_24H_USD = exports.MIN_LIQUIDITY_USD = void 0;
exports.getPoolLastTradeTime = getPoolLastTradeTime;
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
const maxStaleMs = exports.MAX_STALE_HOURS * 60 * 60 * 1000;
function getPoolLastTradeTime(pool) {
    return pool.last_trade_time ?? pool.last_updated;
}
function getPoolValidationReason(pool, now = Date.now()) {
    if (!pool.tokenA || !pool.tokenB)
        return "missing tokenA or tokenB";
    if (!pool.pool_id)
        return "missing pool_id";
    if (!Number.isFinite(pool.liquidity_usd))
        return "invalid liquidity_usd";
    if (!Number.isFinite(pool.volume_24h))
        return "invalid volume_24h";
    if (!Number.isFinite(pool.last_updated))
        return "invalid last_updated";
    if (pool.liquidity_usd < exports.MIN_LIQUIDITY_USD) {
        return `liquidity_usd below minimum threshold (${exports.MIN_LIQUIDITY_USD})`;
    }
    if (pool.volume_24h < exports.MIN_VOLUME_24H_USD) {
        return `volume_24h below minimum threshold (${exports.MIN_VOLUME_24H_USD})`;
    }
    const lastTradeTime = getPoolLastTradeTime(pool);
    if (!Number.isFinite(lastTradeTime))
        return "invalid last_trade_time";
    if (now - lastTradeTime > maxStaleMs) {
        return `last_trade_time older than ${exports.MAX_STALE_HOURS}h`;
    }
    return null;
}
function validatePool(pool) {
    return getPoolValidationReason(pool) === null;
}
