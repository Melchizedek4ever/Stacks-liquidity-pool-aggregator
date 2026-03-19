import axios from "axios";
import { ApiPool, Pool } from "../types/pool";
import { normalizePool } from "../utils/pools";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/",
  timeout: 15000
});

export async function fetchPools(): Promise<Pool[]> {
  const response = await api.get<ApiPool[]>("/pools");
  return response.data.map(normalizePool);
}
