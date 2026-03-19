interface KpiCardProps {
  label: string;
  value: string;
  accent: string;
  helper: string;
}

export function KpiCard({ label, value, accent, helper }: KpiCardProps) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-[#1d2a3f] bg-[linear-gradient(160deg,#0f192a_0%,#0a111f_78%)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
      <div
        aria-hidden="true"
        className={`absolute inset-x-6 top-0 h-1.5 rounded-full ${accent}`}
      />
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7f9abf]">
        {label}
      </p>
      <p className="mt-4 font-['Manrope',sans-serif] text-3xl font-bold text-[#f3f8ff]">
        {value}
      </p>
      <p className="mt-2 text-sm text-[#a3b8d5]">{helper}</p>
    </article>
  );
}
