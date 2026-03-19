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
  bitflow: "#2f7df6",
  velar: "#5297ff",
  alex: "#37b6ff",
  unknown: "#4a6488"
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
    <section className="rounded-3xl border border-[#3a5276] bg-[linear-gradient(180deg,#182a44_0%,#122239_100%)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#c7d8ee]">
          Market Snapshot
        </p>
        <h2 className="font-['Manrope',sans-serif] text-2xl font-bold text-[#f3f8ff]">
          Top 10 pools by liquidity
        </h2>
        <p className="text-sm text-[#d3e1f5]">
          Color-coded by DEX so the liquidity leaders are easy to compare at a glance.
        </p>
      </div>

      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topPools} margin={{ top: 16, right: 16, left: 0, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2f4568" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#d6e4f8", fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#d6e4f8", fontSize: 12 }}
              width={95}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#101b2d",
                border: "1px solid #2c3f5f",
                borderRadius: "14px",
                color: "#dce8ff"
              }}
              labelStyle={{ color: "#dce8ff", fontWeight: 600 }}
              itemStyle={{ color: "#c4d7f4" }}
              cursor={{ fill: "rgba(47, 125, 246, 0.11)" }}
              formatter={(value: number) => [formatCurrency(value), "Liquidity"]}
              labelFormatter={(_, payload) => {
                const pool = payload?.[0]?.payload as Pool | undefined;
                return pool ? `${pool.token0}/${pool.token1} • ${pool.source}` : "";
              }}
            />
            <Bar dataKey="liquidityUSD" radius={[10, 10, 4, 4]} animationDuration={700}>
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
