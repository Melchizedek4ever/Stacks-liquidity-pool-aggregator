interface StatusBannerProps {
  message: string;
}

export function StatusBanner({ message }: StatusBannerProps) {
  return (
    <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      {message}. Showing the latest cached snapshot while the API recovers.
    </div>
  );
}
