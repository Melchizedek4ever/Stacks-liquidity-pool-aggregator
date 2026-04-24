"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPoolValidationReason = getPoolValidationReason;
exports.validatePool = validatePool;
function getPoolValidationReason(pool) {
    if (!pool.tokenA || !pool.tokenB)
        return "missing tokenA or tokenB";
    if (pool.liquidity_usd < 100)
        return "liquidity_usd below minimum threshold (100)";
    return null;
}
function validatePool(pool) {
    return getPoolValidationReason(pool) === null;
}
