"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOKEN_REGISTRY = void 0;
exports.normalizeToken = normalizeToken;
exports.normalizePoolTokens = normalizePoolTokens;
exports.listTokens = listTokens;
const tokens_1 = require("../db/tokens");
const CACHE_TTL_MS = 5 * 60 * 1000;
let registryCache = null;
const normalizeKey = (value) => {
    if (typeof value !== "string")
        return null;
    const normalized = value.trim().toLowerCase();
    return normalized.length ? normalized : null;
};
const buildRegistry = async () => {
    const [tokens, aliases] = await Promise.all([(0, tokens_1.fetchTokens)(), (0, tokens_1.fetchTokenAliases)()]);
    const tokensById = new Map();
    for (const token of tokens) {
        const tokenId = normalizeKey(token.id);
        if (!tokenId)
            continue;
        tokensById.set(tokenId, token);
    }
    const aliasMap = new Map();
    for (const alias of aliases) {
        const dexKey = normalizeKey(alias.dex);
        const aliasKeyPart = normalizeKey(alias.alias);
        const tokenId = normalizeKey(alias.token_id);
        if (!dexKey || !aliasKeyPart || !tokenId)
            continue;
        const key = `${dexKey}:${aliasKeyPart}`;
        aliasMap.set(key, tokenId);
    }
    return {
        tokensById,
        aliases: aliasMap,
        loadedAt: Date.now()
    };
};
const getRegistry = async () => {
    if (registryCache && Date.now() - registryCache.loadedAt < CACHE_TTL_MS) {
        return registryCache;
    }
    registryCache = await buildRegistry();
    return registryCache;
};
async function normalizeToken(dex, tokenIdentifier) {
    const dexKey = normalizeKey(dex);
    const tokenKey = normalizeKey(tokenIdentifier);
    if (!dexKey || !tokenKey)
        return null;
    const registry = await getRegistry();
    const aliasKey = `${dexKey}:${tokenKey}`;
    const aliasTokenId = registry.aliases.get(aliasKey);
    if (aliasTokenId) {
        return registry.tokensById.get(aliasTokenId)?.id ?? aliasTokenId;
    }
    return registry.tokensById.get(tokenKey)?.id ?? null;
}
async function normalizePoolTokens(pool) {
    if (!pool?.dex || !pool?.token0 || !pool?.token1)
        return null;
    const [token0, token1] = await Promise.all([
        normalizeToken(pool.dex, pool.token0),
        normalizeToken(pool.dex, pool.token1)
    ]);
    if (!token0 || !token1)
        return null;
    return { token0, token1 };
}
async function listTokens() {
    const registry = await getRegistry();
    return Array.from(registry.tokensById.values());
}
exports.TOKEN_REGISTRY = {
    STX: {
        id: "STX",
        address: null,
        contract: null,
        symbol: "STX",
        decimals: 6,
        isNative: true,
        verified: true,
        source: "registry",
    },
    // Add known tokens gradually
    "SP3Y2ZSH8P7D50B0VBTSX11S7XSG24M1VB9YFQA4K.token-aeusdc": {
        id: "SP3Y2ZSH8P7D50B0VBTSX11S7XSG24M1VB9YFQA4K.token-aeusdc",
        address: "SP3Y2ZSH8P7D50B0VBTSX11S7XSG24M1VB9YFQA4K",
        contract: "token-aeusdc",
        symbol: "aeUSDC",
        decimals: 6,
        isNative: false,
        verified: true,
        source: "registry",
    },
    "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-susdt": {
        id: "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-susdt",
        address: "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9",
        contract: "token-susdt",
        symbol: "sUSDT",
        decimals: 6,
        isNative: false,
        verified: true,
        source: "registry",
    },
};
