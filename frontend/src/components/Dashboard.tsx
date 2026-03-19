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
    <main className="min-h-screen text-[#dce8ff]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Header
          lastUpdatedLabel={formatTimestamp(lastUpdated)}
          isRefreshing={isRefreshing}
        />

        {error ? <StatusBanner message={error} /> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <KpiCard
            label="Total Liquidity"
            value={formatCurrency(totalLiquidity)}
            accent="bg-[#2f7df6]"
            helper="Combined TVL across all indexed Stacks pools."
          />
          <KpiCard
            label="24h Volume"
            value={formatCurrency(totalVolume24h)}
            accent="bg-[#38bdf8]"
            helper="Rolling 24 hour turnover from the current dataset."
          />
          <KpiCard
            label="Pools Indexed"
            value={formatCompactNumber(pools.length)}
            accent="bg-[#60a5fa]"
            helper="Active rows available for ranking and table sorting."
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <PoolsBarChart pools={pools} />

          <aside className="rounded-3xl border border-[#1d2a3f] bg-[linear-gradient(160deg,#0e1727_0%,#0a111d_70%)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7f9abf]">
              Live Feed
            </p>
            <h2 className="mt-2 font-['Manrope',sans-serif] text-2xl font-bold text-[#f3f8ff]">
              Dashboard status
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-[#adc0dc]">
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
