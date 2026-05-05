import {
  TOKEN_REGISTRY,
  CanonicalToken,
  getRegisteredToken,
  registerToken
} from "./tokenRegistry"

const tokenCache = new Map<string, CanonicalToken>()
const autoRegisteredTokens = new Set<string>()

function normalizeRawToken(raw: string): string | null {
  if (typeof raw !== "string") return null

  let normalized = raw.trim()
  if (!normalized) return null

  if (normalized === "Stacks") return "STX"

  if (normalized.startsWith("Stacks/")) {
    normalized = normalized.replace("Stacks/", "")
  }

  return normalized.trim() || null
}

function safeParse(token: string): { address: string; contract: string } | null {
  const parts = token.split(".")
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null

  return {
    address: parts[0],
    contract: parts[1],
  }
}

function deriveSymbol(token: string): string {
  const parsed = safeParse(token)
  const rawSymbol = parsed?.contract ?? token
  const cleaned = rawSymbol
    .split("/")
    .pop()!
    .replace(/^wrapped[-_]/i, "")
    .replace(/^token[-_]/i, "")
    .replace(/[-_]?token$/i, "")
    .replace(/[^a-zA-Z0-9]/g, "")

  return cleaned || token
}

function inferDecimals(symbol: string): number {
  const normalized = symbol.toLowerCase()
  if (normalized.includes("btc")) return 8
  return 6
}

function createUnverifiedToken(identifier: string): CanonicalToken {
  const parsed = safeParse(identifier)
  const symbol = deriveSymbol(identifier)

  return {
    id: parsed ? `${parsed.address}.${parsed.contract}` : symbol.toLowerCase(),
    address: parsed?.address ?? null,
    contract: parsed?.contract ?? null,
    symbol,
    decimals: inferDecimals(symbol),
    isNative: false,
    verified: false,
    source: "fallback",
  }
}

export async function normalizeToken(raw: string): Promise<CanonicalToken | null> {
  const normalized = normalizeRawToken(raw)
  if (!normalized) return null

  const cacheKey = normalized.toLowerCase()
  const cached = tokenCache.get(cacheKey)
  if (cached) return cached

  const registered = getRegisteredToken(normalized)
  if (registered) {
    tokenCache.set(cacheKey, registered)
    return registered
  }

  const fallback = registerToken(createUnverifiedToken(normalized))
  tokenCache.set(cacheKey, fallback)
  autoRegisteredTokens.add(fallback.id)

  console.warn(
    JSON.stringify({
      event: "unknown_token_auto_registered",
      raw,
      token_id: fallback.id,
      symbol: fallback.symbol,
      decimals: fallback.decimals,
      verified: fallback.verified
    })
  )

  return fallback
}

export const resolveToken = normalizeToken

export function isVerifiedToken(identifier?: string | null): boolean {
  const token = identifier ? getRegisteredToken(identifier) ?? TOKEN_REGISTRY[identifier] : null
  return token?.verified === true
}

export function logUnknownTokens() {
  if (autoRegisteredTokens.size === 0) return

  console.warn(
    JSON.stringify({
      event: "unknown_tokens_summary",
      count: autoRegisteredTokens.size,
      token_ids: [...autoRegisteredTokens]
    })
  )
}
