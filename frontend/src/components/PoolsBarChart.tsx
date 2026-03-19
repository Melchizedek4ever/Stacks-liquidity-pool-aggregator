import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Pool } from "../types/pool";
import { formatCurrency, truncateMiddle } from "../utils/format";

const sourceColorMap = {
  bitflow: "#4f46e5",
  velar: "#7c3aed",
  alex: "#f97316",
  unknown: "#64748b"
};

export function PoolsBarChart({ pools }: { pools: Pool[] }) {
  const topPools = [...pools]
    .sort((a, b) => b.liquidityUSD - a.liquidityUSD)
    .slice(0, 10)
    .map((pool) => ({
      ...pool,
      label: truncateMiddle(`${pool.token0}/${pool.token1}`, 6, 4)
    }));

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
          Market Snapshot
        </p>
        <h2 className="font-['Space_Grotesk',sans-serif] text-2xl font-bold text-slate-950">
          Top 10 pools by liquidity
        </h2>
        <p className="text-sm text-slate-600">
          Color-coded by DEX so the liquidity leaders are easy to compare at a glance.
        </p>
      </div>

      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topPools} margin={{ top: 16, right: 16, left: 0, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#475569", fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#475569", fontSize: 12 }}
              width={95}
            />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.08)" }}
              formatter={(value: number) => [formatCurrency(value), "Liquidity"]}
              labelFormatter={(_, payload) => {
                const pool = payload?.[0]?.payload as Pool | undefined;
                return pool ? `${pool.token0}/${pool.token1} • ${pool.source}` : "";
              }}
            />
            <Bar dataKey="liquidityUSD" radius={[12, 12, 4, 4]} animationDuration={700}>
              {topPools.map((pool) => (
                <Cell key={pool.id} fill={sourceColorMap[pool.source]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
