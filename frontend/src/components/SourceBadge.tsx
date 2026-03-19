import { PoolSource } from "../types/pool";

const sourceStyles: Record<PoolSource, string> = {
  bitflow: "bg-[#4f46e5]/15 text-[#312e81] ring-[#4f46e5]/25",
  velar: "bg-[#7c3aed]/15 text-[#581c87] ring-[#7c3aed]/25",
  alex: "bg-[#f97316]/15 text-[#9a3412] ring-[#f97316]/25",
  unknown: "bg-slate-400/15 text-slate-700 ring-slate-400/25"
};

export function SourceBadge({ source }: { source: PoolSource }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ring-1 ring-inset ${sourceStyles[source]}`}
    >
      {source}
    </span>
  );
}
