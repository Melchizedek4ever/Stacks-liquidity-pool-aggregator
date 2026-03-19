import { PoolSource } from "../types/pool";

const sourceStyles: Record<PoolSource, string> = {
  bitflow: "bg-[#2f7df6]/30 text-[#dbeafe] ring-[#2f7df6]/45",
  velar: "bg-[#5297ff]/30 text-[#eff6ff] ring-[#5297ff]/45",
  alex: "bg-[#37b6ff]/30 text-[#f0f9ff] ring-[#37b6ff]/45",
  unknown: "bg-[#4d668d]/35 text-[#e2edff] ring-[#6d87af]/45"
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
