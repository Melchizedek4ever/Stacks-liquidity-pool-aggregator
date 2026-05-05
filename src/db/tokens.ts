import { supabase } from "./supabase"

export interface TokenRecord {
  id: string
  symbol: string
  name: string
  decimals: number
  verified?: boolean
}

export interface TokenAliasRecord {
  dex: string
  alias: string
  token_id: string
}

export async function fetchTokens(): Promise<TokenRecord[]> {
  const { data, error } = await supabase.from("tokens").select("id, symbol, name, decimals")
  if (error) {
    throw error
  }
  return (data ?? []) as TokenRecord[]
}

export async function fetchTokenAliases(): Promise<TokenAliasRecord[]> {
  const { data, error } = await supabase
    .from("token_aliases")
    .select("dex, alias, token_id")

  if (error) {
    throw error
  }
  return (data ?? []) as TokenAliasRecord[]
}
