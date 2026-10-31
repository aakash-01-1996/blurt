export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-[#0071E3] flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="2.6" height="10" rx="1.3" fill="white" />
          <rect x="6.7" y="5.5" width="2.6" height="7.5" rx="1.3" fill="white" />
          <rect x="11.4" y="4.2" width="2.6" height="8.8" rx="1.3" fill="white" />
        </svg>
      </div>
      <span className={`font-display text-2xl font-bold ${dark ? "text-white" : "text-[#1D1D1F]"}`}>
        blurt
      </span>
    </div>
  );
}
