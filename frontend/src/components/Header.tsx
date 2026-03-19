import { FaCoins } from "react-icons/fa";

interface HeaderProps {
  lastUpdatedLabel: string;
  isRefreshing: boolean;
}

export function Header({ lastUpdatedLabel, isRefreshing }: HeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-[2rem] border border-slate-900/10 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.28),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.22),_transparent_30%),linear-gradient(135deg,#fff8ef_0%,#eff6ff_48%,#f8fafc_100%)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-900/10 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white">
              <FaCoins />
            </span>
            Stacks Liquidity Pool Dashboard
          </div>
          <h1 className="mt-6 font-['Space_Grotesk',sans-serif] text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Track where liquidity is actually moving across Stacks.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-700">
            A live cross-DEX view of Bitflow, Velar, and Alex pools with fast ranking,
            volume context, and a table built for scanning market structure.
          </p>
        </div>

        <div className="flex min-w-[240px] flex-col gap-3 rounded-[1.5rem] border border-white/70 bg-white/75 p-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${isRefreshing ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
            />
            <span className="text-sm font-medium text-slate-700">
              {isRefreshing ? "Refreshing now" : "Live polling every 60s"}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Last updated
            </p>
            <p className="mt-1 text-sm text-slate-800">{lastUpdatedLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
