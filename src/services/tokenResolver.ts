import { TOKEN_REGISTRY, CanonicalToken } from "./tokenRegistry"

const tokenCache = new Map<string, CanonicalToken>()
const unknownTokens = new Set<string>()

// Normalize raw input
function normalizeRawToken(raw: string): string | null {
  if (!raw) return null

  if (raw === "Stacks") return "STX"

  if (raw.startsWith("Stacks/")) {
    raw = raw.replace("Stacks/", "")
  }

  return raw.trim()
}

// Safe parser
function safeParse(token: string) {
  const parts = token.split(".")
  if (parts.length !== 2) return null

  return {
    address: parts[0],
    contract: parts[1],
  }
}

// Fallback resolver (creates token from contract address)
async function resolveFromFallback(parsed: {
  address: string
  contract: string
}): Promise<CanonicalToken | null> {
  try {
    // Try to fetch contract details
    const res = await fetch(
      `https://stacks-node-api.mainnet.stacks.co/v2/contracts/interface/${parsed.address}/${parsed.contract}`,
      { signal: AbortSignal.timeout(2000) }
    )

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
      }
    }
  } catch {
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
  }
}

// MAIN RESOLVER
export async function resolveToken(raw: string): Promise<CanonicalToken | null> {
  const normalized = normalizeRawToken(raw)
  if (!normalized) return null

  // Cache
  if (tokenCache.has(normalized)) {
    return tokenCache.get(normalized)!
  }

  // Registry
  if (TOKEN_REGISTRY[normalized]) {
    const token = TOKEN_REGISTRY[normalized]
    tokenCache.set(normalized, token)
    return token
  }

  // Native STX
  if (normalized === "STX") {
    const token = TOKEN_REGISTRY["STX"]
    tokenCache.set(normalized, token)
    return token
  }

  // Parse contract
  const parsed = safeParse(normalized)
  if (!parsed) {
    unknownTokens.add(raw)
    return null
  }

  // Fallback
  const fallback = await resolveFromFallback(parsed)

  if (fallback) {
    tokenCache.set(normalized, fallback)
    return fallback
  }

  unknownTokens.add(raw)
  return null
}

// Debug helper
export function logUnknownTokens() {
  if (unknownTokens.size > 0) {
    console.warn("Unknown tokens:", [...unknownTokens])
  }
}