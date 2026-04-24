"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
exports.fetchJsonWithRetry = fetchJsonWithRetry;
const DEFAULT_RETRY_OPTIONS = {
    retries: 3,
    minDelayMs: 300,
    maxDelayMs: 2_000,
    factor: 2,
    jitter: true
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const calculateDelay = (attempt, options) => {
    const exponential = options.minDelayMs * Math.pow(options.factor, attempt);
    const capped = Math.min(exponential, options.maxDelayMs);
    if (!options.jitter)
        return capped;
    const jitter = Math.random() * capped * 0.2;
    return capped - jitter;
};
async function withRetry(fn, options = {}) {
    const settings = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        }
        catch (error) {
            if (attempt >= settings.retries) {
                throw error;
            }
            const delay = calculateDelay(attempt, settings);
            await sleep(delay);
            attempt += 1;
        }
    }
}
async function fetchJsonWithRetry(url, init, options) {
    return withRetry(async () => {
        const response = await fetch(url, init);
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }
        return (await response.json());
    }, options);
}
