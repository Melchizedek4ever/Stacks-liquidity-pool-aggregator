import { Pool } from "../types/pool"

export type AdapterPool = Pool

export interface DexAdapter {
  name: string
  fetchPools(): Promise<AdapterPool[]>
}
