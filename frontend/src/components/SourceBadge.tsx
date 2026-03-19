import { PoolSource } from "../types/pool";

const sourceStyles: Record<PoolSource, string> = {
  bitflow: "bg-[#2f7df6]/20 text-[#93c5fd] ring-[#2f7df6]/30",
  velar: "bg-[#5297ff]/20 text-[#bfdbfe] ring-[#5297ff]/30",
  alex: "bg-[#37b6ff]/20 text-[#bae6fd] ring-[#37b6ff]/30",
  unknown: "bg-[#3f587a]/30 text-[#9bb3d4] ring-[#4a6488]/35"
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
