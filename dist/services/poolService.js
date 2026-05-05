"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllPools = getAllPools;
exports.getPoolsByDex = getPoolsByDex;
exports.getTopPools = getTopPools;
exports.getBestPools = getBestPools;
const pools_1 = require("../db/pools");
const ranking_1 = require("./ranking");
const validatePool_1 = require("../utils/validatePool");
async function getAllPools() {
    return (0, pools_1.fetchPools)();
}
async function getPoolsByDex(dex) {
    return (0, pools_1.fetchPoolsByDex)(dex);
}
async function getTopPools(limit = 10) {
    return (0, pools_1.fetchTopPoolsByApy)(limit);
}
async function getBestPools() {
    const pools = await (0, pools_1.fetchPools)();
    return (0, ranking_1.rankPools)(pools).filter((pool) => (pool.validation_score ?? 0) >= validatePool_1.MIN_VALIDATION_SCORE);
}
