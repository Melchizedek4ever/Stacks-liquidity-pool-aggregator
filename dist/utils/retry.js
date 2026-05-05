"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTransientError = isTransientError;
exports.withRetry = withRetry;
exports.fetchJsonWithRetry = fetchJsonWithRetry;
const DEFAULT_RETRY_OPTIONS = {
    retries: 4,
    minDelayMs: 1_000,
    maxDelayMs: 8_000,
    factor: 2,
    jitter: true,
    operationName: "operation",
    shouldRetry: isTransientError
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
function getErrorStatus(error) {
    if (!error || typeof error !== "object")
        return null;
    const record = error;
    const status = Number(record.status ?? record.statusCode);
    if (Number.isFinite(status))
        return status;
    const message = typeof record.message === "string" ? record.message : "";
    const statusMatch = message.match(/\b(5\d{2}|408|429)\b/);
    return statusMatch ? Number(statusMatch[1]) : null;
}
function getErrorCode(error) {
    if (!error || typeof error !== "object")
        return null;
    const code = error.code;
    return typeof code === "string" ? code : null;
}
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    if (error && typeof error === "object") {
        const message = error.message;
        if (typeof message === "string")
            return message;
    }
    return String(error);
}
function isTransientError(error) {
    const status = getErrorStatus(error);
    if (status !== null) {
        return status === 408 || status === 429 || status >= 500;
    }
    const code = getErrorCode(error);
    if (code &&
        [
            "ECONNRESET",
            "ECONNREFUSED",
            "ETIMEDOUT",
            "EAI_AGAIN",
            "ENOTFOUND",
            "UND_ERR_CONNECT_TIMEOUT",
            "UND_ERR_HEADERS_TIMEOUT",
            "PGRST301"
        ].includes(code)) {
        return true;
    }
    const message = getErrorMessage(error).toLowerCase();
    return [
        "fetch failed",
        "network",
        "timeout",
        "temporarily unavailable",
        "cloudflare",
        "error 521",
        "521"
    ].some((text) => message.includes(text));
}
async function withRetry(fn, options = {}) {
    const settings = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        }
        catch (error) {
            const retryable = settings.shouldRetry(error);
            if (!retryable || attempt >= settings.retries) {
                throw error;
            }
            const delay = calculateDelay(attempt, settings);
            console.warn(JSON.stringify({
                event: "retry_attempt",
                operation: settings.operationName,
                attempt: attempt + 1,
                next_attempt: attempt + 2,
                max_attempts: settings.retries + 1,
                delay_ms: Math.round(delay),
                error: getErrorMessage(error)
            }));
            await sleep(delay);
            attempt += 1;
        }
    }
}
async function fetchJsonWithRetry(url, init, options) {
    return withRetry(async () => {
        const response = await fetch(url, init);
        if (!response.ok) {
            const error = new Error(`Request failed: ${response.status} ${response.statusText}`);
            error.status = response.status;
            throw error;
        }
        return (await response.json());
    }, { operationName: `fetch ${url}`, ...options });
}
