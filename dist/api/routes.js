"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const serializers_1 = require("./serializers");
const poolService_1 = require("../services/poolService");
const tokenRegistry_1 = require("../services/tokenRegistry");
async function registerRoutes(app) {
    app.get("/pools", async (_request, reply) => {
        try {
            const pools = await (0, poolService_1.getAllPools)();
            return pools.map(serializers_1.toPoolResponse);
        }
        catch (error) {
            app.log.error(error);
            return reply.code(500).send({ error: "Failed to fetch pools" });
        }
    });
    app.get("/pools/top", async (_request, reply) => {
        try {
            const pools = await (0, poolService_1.getTopPools)(10);
            return pools.map(serializers_1.toPoolResponse);
        }
        catch (error) {
            app.log.error(error);
            return reply.code(500).send({ error: "Failed to fetch top pools" });
        }
    });
    app.get("/pools/best", async (_request, reply) => {
        try {
            const pools = await (0, poolService_1.getBestPools)();
            return pools.map(serializers_1.toRankedPoolResponse);
        }
        catch (error) {
            app.log.error(error);
            return reply.code(500).send({ error: "Failed to fetch ranked pools" });
        }
    });
    app.get("/pools/:dex", async (request, reply) => {
        try {
            const pools = await (0, poolService_1.getPoolsByDex)(request.params.dex);
            return pools.map(serializers_1.toPoolResponse);
        }
        catch (error) {
            app.log.error(error);
            return reply.code(500).send({ error: "Failed to fetch pools for dex" });
        }
    });
    app.get("/tokens", async (_request, reply) => {
        try {
            const tokens = await (0, tokenRegistry_1.listTokens)();
            return tokens.map((token) => ({ symbol: token.symbol, name: token.name }));
        }
        catch (error) {
            app.log.error(error);
            return reply.code(500).send({ error: "Failed to fetch tokens" });
        }
    });
}
