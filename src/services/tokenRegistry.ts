import { fetchTokenAliases, fetchTokens, TokenRecord } from "../db/tokens"

interface RegistryCache {
  tokensById: Map<string, TokenRecord>
  aliases: Map<string, string>
  loadedAt: number
}

const CACHE_TTL_MS = 5 * 60 * 1000
let registryCache: RegistryCache | null = null

const normalizeKey = (value?: string | null): string | null => {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  return normalized.length ? normalized : null
}

const buildRegistry = async (): Promise<RegistryCache> => {
  const [tokens, aliases] = await Promise.all([fetchTokens(), fetchTokenAliases()])

  const tokensById = new Map<string, TokenRecord>()
  for (const token of tokens) {
    const tokenId = normalizeKey(token.id)
    if (!tokenId) continue
    tokensById.set(tokenId, token)
  }

  const aliasMap = new Map<string, string>()
  for (const alias of aliases) {
    const dexKey = normalizeKey(alias.dex)
    const aliasKeyPart = normalizeKey(alias.alias)
    const tokenId = normalizeKey(alias.token_id)

    if (!dexKey || !aliasKeyPart || !tokenId) continue

    const key = `${dexKey}:${aliasKeyPart}`
    aliasMap.set(key, tokenId)
  }

  return {
    tokensById,
    aliases: aliasMap,
    loadedAt: Date.now()
  }
}

const getRegistry = async (): Promise<RegistryCache> => {
  if (registryCache && Date.now() - registryCache.loadedAt < CACHE_TTL_MS) {
    return registryCache
  }
  registryCache = await buildRegistry()
  return registryCache
}

export async function normalizeToken(
  dex: string,
  tokenIdentifier?: string | null
): Promise<string | null> {
  const dexKey = normalizeKey(dex)
  const tokenKey = normalizeKey(tokenIdentifier)

  if (!dexKey || !tokenKey) return null

  const registry = await getRegistry()
  const aliasKey = `${dexKey}:${tokenKey}`

  const aliasTokenId = registry.aliases.get(aliasKey)
  if (aliasTokenId) {
    return registry.tokensById.get(aliasTokenId)?.id ?? aliasTokenId
  }

  return registry.tokensById.get(tokenKey)?.id ?? null
}

export async function normalizePoolTokens(pool: {
  dex: string
  token0?: string | null
  token1?: string | null
}): Promise<{ token0: string; token1: string } | null> {
  if (!pool?.dex || !pool?.token0 || !pool?.token1) return null

  const [token0, token1] = await Promise.all([
    normalizeToken(pool.dex, pool.token0),
    normalizeToken(pool.dex, pool.token1)
  ])

  if (!token0 || !token1) return null
  return { token0, token1 }
}

export async function listTokens(): Promise<TokenRecord[]> {
  const registry = await getRegistry()
  return Array.from(registry.tokensById.values())
}

export interface CanonicalToken {
  id: string
  address: string | null
  contract: string | null
  symbol: string
  decimals: number
  isNative: boolean
  verified: boolean
  source: "registry" | "cache" | "fallback"
}

export const TOKEN_REGISTRY: Record<string, CanonicalToken> = {
  stx: {
    id: "stx",
    address: null,
    contract: null,
    symbol: "STX",
    decimals: 6,
    isNative: true,
    verified: true,
    source: "registry",
  },

  STX: {
    id: "stx",
    address: null,
    contract: null,
    symbol: "STX",
    decimals: 6,
    isNative: true,
    verified: true,
    source: "registry",
  },

  sbtc: {
    id: "sbtc",
    address: null,
    contract: null,
    symbol: "sBTC",
    decimals: 8,
    isNative: false,
    verified: true,
    source: "registry",
  },

  sBTC: {
    id: "sbtc",
    address: null,
    contract: null,
    symbol: "sBTC",
    decimals: 8,
    isNative: false,
    verified: true,
    source: "registry",
  },

  usda: {
    id: "usda",
    address: null,
    contract: null,
    symbol: "USDA",
    decimals: 6,
    isNative: false,
    verified: true,
    source: "registry",
  },

  USDA: {
    id: "usda",
    address: null,
    contract: null,
    symbol: "USDA",
    decimals: 6,
    isNative: false,
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
}

export function getRegisteredToken(identifier?: string | null): CanonicalToken | null {
  const tokenKey = normalizeKey(identifier)
  if (!tokenKey) return null

  return (
    TOKEN_REGISTRY[identifier as string] ??
    TOKEN_REGISTRY[tokenKey] ??
    TOKEN_REGISTRY[tokenKey.toUpperCase()] ??
    Object.values(TOKEN_REGISTRY).find(
      (token) =>
        normalizeKey(token.id) === tokenKey || normalizeKey(token.symbol) === tokenKey
    ) ??
    null
  )
}

export function registerToken(token: CanonicalToken): CanonicalToken {
  TOKEN_REGISTRY[token.id] = token
  TOKEN_REGISTRY[token.symbol] = token
  TOKEN_REGISTRY[token.id.toLowerCase()] = token
  return token
}
