"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveToken = resolveToken;
exports.logUnknownTokens = logUnknownTokens;
const tokenRegistry_1 = require("./tokenRegistry");
const tokenCache = new Map();
const unknownTokens = new Set();
// Normalize raw input
function normalizeRawToken(raw) {
    if (!raw)
        return null;
    if (raw === "Stacks")
        return "STX";
    if (raw.startsWith("Stacks/")) {
        raw = raw.replace("Stacks/", "");
    }
    return raw.trim();
}
// Safe parser
function safeParse(token) {
    const parts = token.split(".");
    if (parts.length !== 2)
        return null;
    return {
        address: parts[0],
        contract: parts[1],
    };
}
// Fallback resolver (creates token from contract address)
async function resolveFromFallback(parsed) {
    try {
        // Try to fetch contract details
        const res = await fetch(`https://stacks-node-api.mainnet.stacks.co/v2/contracts/interface/${parsed.address}/${parsed.contract}`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
            return {
                id: `${parsed.address}.${parsed.contract}`,
                address: parsed.address,
                contract: parsed.contract,
                symbol: parsed.contract,
                decimals: 6,
                isNative: false,
                verified: true,
                source: "fallback",
            };
        }
    }
    catch {
        // API call failed, but we can still accept the contract address
    }
    // Create token from contract address even if API verification failed
    return {
        id: `${parsed.address}.${parsed.contract}`,
        address: parsed.address,
        contract: parsed.contract,
        symbol: parsed.contract,
        decimals: 6,
        isNative: false,
        verified: false,
        source: "fallback",
    };
}
// MAIN RESOLVER
async function resolveToken(raw) {
    const normalized = normalizeRawToken(raw);
    if (!normalized)
        return null;
    // Cache
    if (tokenCache.has(normalized)) {
        return tokenCache.get(normalized);
    }
    // Registry
    if (tokenRegistry_1.TOKEN_REGISTRY[normalized]) {
        const token = tokenRegistry_1.TOKEN_REGISTRY[normalized];
        tokenCache.set(normalized, token);
        return token;
    }
    // Native STX
    if (normalized === "STX") {
        const token = tokenRegistry_1.TOKEN_REGISTRY["STX"];
        tokenCache.set(normalized, token);
        return token;
    }
    // Parse contract
    const parsed = safeParse(normalized);
    if (!parsed) {
        unknownTokens.add(raw);
        return null;
    }
    // Fallback
    const fallback = await resolveFromFallback(parsed);
    if (fallback) {
        tokenCache.set(normalized, fallback);
        return fallback;
    }
    unknownTokens.add(raw);
    return null;
}
// Debug helper
function logUnknownTokens() {
    if (unknownTokens.size > 0) {
        console.warn("Unknown tokens:", [...unknownTokens]);
    }
}
