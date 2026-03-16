import { fetchTokenAliases, fetchTokens, TokenRecord } from "../db/tokens"

interface RegistryCache {
  tokensById: Map<string, TokenRecord>
  aliases: Map<string, string>
  loadedAt: number
}

const CACHE_TTL_MS = 5 * 60 * 1000
let registryCache: RegistryCache | null = null

const normalizeKey = (value: string) => value.trim().toLowerCase()

const buildRegistry = async (): Promise<RegistryCache> => {
  const [tokens, aliases] = await Promise.all([fetchTokens(), fetchTokenAliases()])

  const tokensById = new Map<string, TokenRecord>()
  for (const token of tokens) {
    tokensById.set(normalizeKey(token.id), token)
  }

  const aliasMap = new Map<string, string>()
  for (const alias of aliases) {
    const key = `${normalizeKey(alias.dex)}:${normalizeKey(alias.alias)}`
    aliasMap.set(key, normalizeKey(alias.token_id))
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
  tokenIdentifier: string
): Promise<string | null> {
  const registry = await getRegistry()
  const dexKey = normalizeKey(dex)
  const tokenKey = normalizeKey(tokenIdentifier)
  const aliasKey = `${dexKey}:${tokenKey}`

  const aliasTokenId = registry.aliases.get(aliasKey)
  if (aliasTokenId) {
    return registry.tokensById.get(aliasTokenId)?.id ?? aliasTokenId
  }

  return registry.tokensById.get(tokenKey)?.id ?? null
}

export async function normalizePoolTokens(pool: {
  dex: string
  tokenA: string
  tokenB: string
}): Promise<{ tokenA: string; tokenB: string } | null> {
  const [tokenA, tokenB] = await Promise.all([
    normalizeToken(pool.dex, pool.tokenA),
    normalizeToken(pool.dex, pool.tokenB)
  ])

  if (!tokenA || !tokenB) return null
  return { tokenA, tokenB }
}

export async function listTokens(): Promise<TokenRecord[]> {
  const registry = await getRegistry()
  return Array.from(registry.tokensById.values())
}
