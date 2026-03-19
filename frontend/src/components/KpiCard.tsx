interface KpiCardProps {
  label: string;
  value: string;
  accent: string;
  helper: string;
}

export function KpiCard({ label, value, accent, helper }: KpiCardProps) {
  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-white/50 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <div
        aria-hidden="true"
        className={`absolute inset-x-6 top-0 h-1 rounded-full ${accent}`}
      />
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        {label}
      </p>
      <p className="mt-4 font-['Space_Grotesk',sans-serif] text-3xl font-bold text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-600">{helper}</p>
    </article>
  );
}
