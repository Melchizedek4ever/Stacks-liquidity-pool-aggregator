import { FaCoins } from "react-icons/fa";

interface HeaderProps {
  lastUpdatedLabel: string;
  isRefreshing: boolean;
}

export function Header({ lastUpdatedLabel, isRefreshing }: HeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-[#1d2a3f] bg-[radial-gradient(circle_at_10%_-10%,rgba(47,125,246,0.34),transparent_35%),linear-gradient(155deg,#111d31_0%,#0b1220_60%,#070d16_100%)] p-8 shadow-[0_35px_90px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-[#2b3c58] bg-[#0f1a2b]/85 px-4 py-2 text-sm font-medium text-[#cae1ff]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2f7df6] text-white">
              <FaCoins />
            </span>
            Stacks Liquidity Pool Dashboard
          </div>
          <h1 className="mt-6 font-['Manrope',sans-serif] text-4xl font-extrabold tracking-tight text-[#f2f8ff] sm:text-5xl">
            Liquidity intelligence across Stacks pools.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#9fb7d9]">
            A live cross-DEX view of Bitflow, Velar, and Alex pools with fast ranking,
            volume context, and a table built for scanning market structure.
          </p>
        </div>

        <div className="flex min-w-[250px] flex-col gap-3 rounded-2xl border border-[#23344f] bg-[#0b1526]/90 p-5">
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${isRefreshing ? "animate-pulse bg-emerald-400" : "bg-[#3f587a]"}`}
            />
            <span className="text-sm font-medium text-[#cae1ff]">
              {isRefreshing ? "Refreshing now" : "Live polling every 60s"}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7f9abf]">
              Last updated
            </p>
            <p className="mt-1 text-sm text-[#dce8ff]">{lastUpdatedLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
