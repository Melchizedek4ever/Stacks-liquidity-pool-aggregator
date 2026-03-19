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
    <section className="rounded-3xl border border-[#1d2a3f] bg-[linear-gradient(180deg,#0d1626_0%,#090f19_100%)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7f9abf]">
            Full Pool Index
          </p>
          <h2 className="font-['Manrope',sans-serif] text-2xl font-bold text-[#f3f8ff]">
            All indexed pools
          </h2>
        </div>
        <p className="text-sm text-[#a3b8d5]">
          Sort by liquidity, 24h volume, or source. Hover the pool ID to inspect the full key.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#1d2a3f]">
        <div className="max-h-[560px] overflow-auto">
          <table className="min-w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#121f34] text-xs uppercase tracking-[0.25em] text-[#c4d7f4]">
              <tr>
                <th className="px-4 py-4 font-semibold">Pool ID</th>
                <th className="px-4 py-4 font-semibold">Token0</th>
                <th className="px-4 py-4 font-semibold">Token1</th>
                <th className="px-4 py-4 font-semibold">
                  <button className="cursor-pointer hover:text-[#f3f8ff]" onClick={() => updateSort("liquidityUSD")}>
                    Liquidity
                  </button>
                </th>
                <th className="px-4 py-4 font-semibold">
                  <button className="cursor-pointer hover:text-[#f3f8ff]" onClick={() => updateSort("volume24h")}>
                    Volume 24h
                  </button>
                </th>
                <th className="px-4 py-4 font-semibold">
                  <button className="cursor-pointer hover:text-[#f3f8ff]" onClick={() => updateSort("source")}>
                    Source
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d2a3f] bg-[#0c1423]">
              {sortedPools.map((pool) => (
                <tr key={pool.id} className="transition-colors hover:bg-[#121f34]">
                  <td className="px-4 py-4 font-mono text-sm text-[#9cb3d3]" title={pool.id}>
                    {truncateMiddle(pool.id, 12, 8)}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-[#e6f0ff]">{pool.token0}</td>
                  <td className="px-4 py-4 text-sm font-medium text-[#e6f0ff]">{pool.token1}</td>
                  <td className="px-4 py-4 text-sm text-[#bfd0ea]">
                    {formatCurrency(pool.liquidityUSD)}
                  </td>
                  <td className="px-4 py-4 text-sm text-[#bfd0ea]">
                    {formatCurrency(pool.volume24h)}
                  </td>
                  <td className="px-4 py-4 text-sm text-[#bfd0ea]">
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
