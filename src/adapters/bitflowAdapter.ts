import { DexAdapter, Pool } from "./types";
import { fetchJsonWithRetry } from "../utils/retry";

const BITFLOW_PUBLIC_API_URL =
  process.env.BITFLOW_PUBLIC_API_URL ||
  "https://bitflow-sdk-api-gateway-7owjsmt8.uc.gateway.dev";

const BITFLOW_BFF_API_URL =
  process.env.BITFLOW_BFF_API_URL ||
  "https://bff.bitflowapis.finance";

const isDev = process.env.NODE_ENV !== "production";

type CandidateResult = {
  url: string;
  status?: number;
  ok: boolean;
  error?: string;
};

function getMockPools(): Pool[] {
  return [
    {
      dex: "bitflow",
      poolId: "mock-bitflow-stx-sbtc",
      token0: "STX",
      token1: "sBTC",
      reserve0: 1_000_000,
      reserve1: 500,
      fee: 0.003,
      source: "mock",
    },
    {
      dex: "bitflow",
      poolId: "mock-bitflow-stx-usda",
      token0: "STX",
      token1: "USDA",
      reserve0: 750_000,
      reserve1: 250_000,
      fee: 0.003,
      source: "mock",
    },
  ];
}

function safeNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeBitflowPools(payload: unknown): Pool[] {
  const candidates = [
    payload,
    (payload as any)?.data,
    (payload as any)?.pools,
    (payload as any)?.data?.pools,
    (payload as any)?.results,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;

    const pools: Pool[] = candidate
      .map((item: any, index: number): Pool | null => {
        const token0 =
          item?.token0 ||
          item?.tokenA ||
          item?.baseToken ||
          item?.token_x ||
          item?.asset0 ||
          item?.symbol0;

        const token1 =
          item?.token1 ||
          item?.tokenB ||
          item?.quoteToken ||
          item?.token_y ||
          item?.asset1 ||
          item?.symbol1;

        if (!token0 || !token1) return null;

        return {
          dex: "bitflow",
          poolId:
            item?.poolId ||
            item?.pool_id ||
            item?.id ||
            `bitflow-pool-${index}`,
          token0: String(token0),
          token1: String(token1),
          reserve0: safeNumber(
            item?.reserve0 ?? item?.reserveA ?? item?.liquidity0 ?? item?.x
          ),
          reserve1: safeNumber(
            item?.reserve1 ?? item?.reserveB ?? item?.liquidity1 ?? item?.y
          ),
          fee: safeNumber(item?.fee ?? item?.feeBps ?? item?.swapFee, 0.003),
          source: "api",
        };
      })
      .filter((pool): pool is Pool => pool !== null);

    if (pools.length > 0) return pools;
  }

  return [];
}

async function fetchCandidate(
  url: string
): Promise<{ pools: Pool[]; meta: CandidateResult }> {
  console.log(`[bitflow] requesting ${url}`);

  try {
    const payload = await fetchJsonWithRetry(url);
    const pools = normalizeBitflowPools(payload);

    if (pools.length > 0) {
      console.log(`[bitflow] ${url} returned 200 OK`);
      console.log(`[bitflow] normalized ${pools.length} pools`);
      return {
        pools,
        meta: { url, status: 200, ok: true },
      };
    }

    console.warn(`[bitflow] ${url} returned 200 but payload was not usable`);
    return {
      pools: [],
      meta: {
        url,
        status: 200,
        ok: false,
        error: "Payload not usable for pool normalization",
      },
    };
  } catch (error: any) {
    const message = error?.message || String(error);
    const statusMatch = message.match(/\b(\d{3})\b/);
    const status = statusMatch ? Number(statusMatch[1]) : undefined;

    if (status) {
      console.warn(`[bitflow] ${url} returned ${status}`);
    } else {
      console.warn(`[bitflow] request failed for ${url}: ${message}`);
    }

    return {
      pools: [],
      meta: {
        url,
        status,
        ok: false,
        error: message,
      },
    };
  }
}

export const bitflowAdapter: DexAdapter = {
  name: "bitflow",

  async fetchPools(): Promise<Pool[]> {
    const candidates = [
      `${BITFLOW_BFF_API_URL}/api/app/v1/pools/metrics`,
      `${BITFLOW_BFF_API_URL}/api/app/v1/pools/categories`,
      `${BITFLOW_PUBLIC_API_URL}/ticker`,
    ];

    const attempted: CandidateResult[] = [];

    for (const url of candidates) {
      const { pools, meta } = await fetchCandidate(url);
      attempted.push(meta);

      if (pools.length > 0) {
        return pools;
      }
    }

    if (isDev) {
      console.warn(
        "[bitflow] all endpoint candidates failed or were unusable; using mock data fallback"
      );
      const mockPools = getMockPools();
      console.log(`[bitflow] returning ${mockPools.length} mock pools`);
      return mockPools;
    }

    console.warn("[bitflow] no pools returned from any candidate endpoint");
    console.warn(`[bitflow] attempted endpoints: ${JSON.stringify(attempted)}`);
    return [];
  },
};