import { usePoolsData } from "../hooks/usePoolsData";
import { formatCompactNumber, formatCurrency, formatTimestamp } from "../utils/format";
import { Header } from "./Header";
import { KpiCard } from "./KpiCard";
import { PoolsBarChart } from "./PoolsBarChart";
import { PoolsTable } from "./PoolsTable";
import { StatusBanner } from "./StatusBanner";

export function Dashboard() {
  const { pools, isLoading, isRefreshing, error, lastUpdated } = usePoolsData();

  const totalLiquidity = pools.reduce((sum, pool) => sum + pool.liquidityUSD, 0);
  const totalVolume24h = pools.reduce((sum, pool) => sum + pool.volume24h, 0);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf2_0%,#f8fbff_35%,#eef2ff_100%)] text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <Header
          lastUpdatedLabel={formatTimestamp(lastUpdated)}
          isRefreshing={isRefreshing}
        />

        {error ? <StatusBanner message={error} /> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <KpiCard
            label="Total Liquidity"
            value={formatCurrency(totalLiquidity)}
            accent="bg-[#4f46e5]"
            helper="Combined TVL across all indexed Stacks pools."
          />
          <KpiCard
            label="24h Volume"
            value={formatCurrency(totalVolume24h)}
            accent="bg-[#f97316]"
            helper="Rolling 24 hour turnover from the current dataset."
          />
          <KpiCard
            label="Pools Indexed"
            value={formatCompactNumber(pools.length)}
            accent="bg-[#7c3aed]"
            helper="Active rows available for ranking and table sorting."
          />
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <PoolsBarChart pools={pools} />

          <aside className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Live Feed
            </p>
            <h2 className="mt-2 font-['Space_Grotesk',sans-serif] text-2xl font-bold text-slate-950">
              Dashboard status
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
              <p>
                The dashboard polls the aggregator every 60 seconds and preserves the
                most recent successful payload if a refresh fails.
              </p>
              <p>
                Liquidity and volume cards update from the same normalized source as the
                chart and table, so the whole page stays in sync.
              </p>
              <p>
                {isLoading
                  ? "Loading the first pool snapshot from the backend."
                  : `${pools.length} pools currently loaded across Bitflow, Velar, and Alex.`}
              </p>
            </div>
          </aside>
        </section>

        <PoolsTable pools={pools} />
      </div>
    </main>
  );
}
