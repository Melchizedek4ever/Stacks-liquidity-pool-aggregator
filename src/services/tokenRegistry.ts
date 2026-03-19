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