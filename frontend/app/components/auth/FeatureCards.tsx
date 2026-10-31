const FEATURES = [
  {
    tile: "bg-[#0071E3]",
    icon: (
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
        <rect x="6" y="2" width="6" height="9" rx="3" fill="white" />
        <path d="M3 9A6 6 0 0 0 15 9" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="9" y1="16" x2="9" y2="12" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    title: "Talk",
    desc: "One tap, any order. Wins, errands, a list.",
  },
  {
    tile: "bg-[#3B3597]",
    icon: (
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
        <path d="M2 6l7 4.5L16 6" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
        <rect x="2" y="4" width="14" height="10" rx="2" stroke="white" strokeWidth="1.6" />
      </svg>
    ),
    title: "Review",
    desc: "Every item shows the exact words it came from.",
  },
  {
    tile: "bg-[#1F6E43]",
    icon: (
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
        <path d="M4 9.5l3 3L14 5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Keep",
    desc: "Approve it, and it's filed. Review season gets easy.",
  },
];

/** Left-panel content shown on the Create-account view. */
export function FeatureCards() {
  return (
    <div className="flex flex-col gap-3.5">
      {FEATURES.map(({ tile, icon, title, desc }) => (
        <div key={title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className={`w-11 h-11 rounded-xl ${tile} flex items-center justify-center shrink-0`}>{icon}</div>
          <div>
            <p className="text-[17px] font-bold text-white">{title}</p>
            <p className="text-sm text-gray-400 mt-0.5">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
