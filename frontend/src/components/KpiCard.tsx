interface KpiCardProps {
  label: string;
  value: string;
  accent: string;
  helper: string;
}

export function KpiCard({ label, value, accent, helper }: KpiCardProps) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-[#3a5276] bg-[linear-gradient(160deg,#1a2c46_0%,#13243c_78%)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
      <div
        aria-hidden="true"
        className={`absolute inset-x-6 top-0 h-1.5 rounded-full ${accent}`}
      />
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c7d8ee]">
        {label}
      </p>
      <p className="mt-4 font-['Manrope',sans-serif] text-3xl font-bold text-[#f3f8ff]">
        {value}
      </p>
      <p className="mt-2 text-sm text-[#d3e1f5]">{helper}</p>
    </article>
  );
}
