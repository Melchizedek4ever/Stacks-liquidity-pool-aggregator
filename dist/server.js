"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const routes_1 = require("./api/routes");
const indexer_1 = require("./workers/indexer");
const app = (0, fastify_1.default)({ logger: true });
const start = async () => {
    await (0, routes_1.registerRoutes)(app);
    const port = Number(process.env.PORT) || 3000;
    await app.listen({ port, host: "0.0.0.0" });
    (0, indexer_1.startIndexer)();
};
start().catch((error) => {
    app.log.error(error);
    process.exit(1);
});
