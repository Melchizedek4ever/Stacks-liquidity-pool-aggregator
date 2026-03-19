import { useState } from "react";
import { Pool } from "../types/pool";
import { formatCurrency, truncateMiddle } from "../utils/format";
import { SourceBadge } from "./SourceBadge";

type SortKey = "source" | "liquidityUSD" | "volume24h";
type SortDirection = "asc" | "desc";

export function PoolsTable({ pools }: { pools: Pool[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("liquidityUSD");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedPools = [...pools].sort((left, right) => {
    const directionFactor = sortDirection === "asc" ? 1 : -1;

    if (sortKey === "source") {
      return left.source.localeCompare(right.source) * directionFactor;
    }

    return (left[sortKey] - right[sortKey]) * directionFactor;
  });

  const updateSort = (nextKey: SortKey) => {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "source" ? "asc" : "desc");
  };

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Full Pool Index
          </p>
          <h2 className="font-['Space_Grotesk',sans-serif] text-2xl font-bold text-slate-950">
            All indexed pools
          </h2>
        </div>
        <p className="text-sm text-slate-600">
          Sort by liquidity, 24h volume, or source. Hover the pool ID to inspect the full key.
        </p>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/80">
        <div className="max-h-[560px] overflow-auto">
          <table className="min-w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-950 text-xs uppercase tracking-[0.25em] text-slate-200">
              <tr>
                <th className="px-4 py-4 font-semibold">Pool ID</th>
                <th className="px-4 py-4 font-semibold">Token0</th>
                <th className="px-4 py-4 font-semibold">Token1</th>
                <th className="px-4 py-4 font-semibold">
                  <button className="cursor-pointer" onClick={() => updateSort("liquidityUSD")}>
                    Liquidity
                  </button>
                </th>
                <th className="px-4 py-4 font-semibold">
                  <button className="cursor-pointer" onClick={() => updateSort("volume24h")}>
                    Volume 24h
                  </button>
                </th>
                <th className="px-4 py-4 font-semibold">
                  <button className="cursor-pointer" onClick={() => updateSort("source")}>
                    Source
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 bg-white">
              {sortedPools.map((pool) => (
                <tr key={pool.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-4 font-mono text-sm text-slate-700" title={pool.id}>
                    {truncateMiddle(pool.id, 12, 8)}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-slate-900">{pool.token0}</td>
                  <td className="px-4 py-4 text-sm font-medium text-slate-900">{pool.token1}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {formatCurrency(pool.liquidityUSD)}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {formatCurrency(pool.volume24h)}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <SourceBadge source={pool.source} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
