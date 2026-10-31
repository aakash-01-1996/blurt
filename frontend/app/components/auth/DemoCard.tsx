const ROWS = [
  { badge: "Work log", badgeCls: "bg-[#2A2E63] text-[#A9B0FF]", title: "Shipped the retry fix", sub: "Failures down about 30%", done: true },
  { badge: "Tasks", badgeCls: "bg-[#4A3415] text-[#E6A866]", title: "Dentist appointment", sub: "Tue · 3:00 PM", done: false },
  { badge: "Lists", badgeCls: "bg-[#173A28] text-[#6FCF97]", title: "Grocery", sub: "Milk, eggs", done: false },
];

/** Left-panel content shown on the Sign-in view — a mock of the review flow. */
export function DemoCard() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-[#FF3B30] flex items-center justify-center shrink-0">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <rect x="6" y="2" width="4" height="7" rx="2" fill="white" />
            <path d="M3.5 7.5A4.5 4.5 0 0 0 12.5 7.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="8" y1="13" x2="8" y2="10.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex items-center gap-[2px] flex-1 h-7">
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              className={`flex-1 rounded-full ${i < 14 ? "bg-[#0A84FF]" : "bg-white/20"}`}
              style={{ height: `${20 + Math.round(Math.abs(Math.sin(i * 1.7)) * 70)}%` }}
            />
          ))}
        </div>
        <span className="font-mono text-xs text-gray-400 shrink-0">0:41</span>
      </div>

      <p className="text-[15px] leading-relaxed text-gray-200 mb-4">
        <span className="text-gray-500">&ldquo;</span>
        <span className="rounded px-1 py-0.5 bg-[#3A3E8C] text-[#DDE0FF] box-decoration-clone">Shipped the retry fix, failures are down about thirty percent.</span>{" "}
        <span className="rounded px-1 py-0.5 bg-[#4A3415] text-[#E6A866] box-decoration-clone">Dentist Tuesday at three.</span>{" "}
        <span className="rounded px-1 py-0.5 bg-[#173A28] text-[#9BE0B8] box-decoration-clone">Oh, and we&rsquo;re out of milk and eggs.</span>
        <span className="text-gray-500">&rdquo;</span>
      </p>

      <div className="flex items-center gap-3 my-4">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-gray-500">Sorted into 3 items</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="flex flex-col gap-2.5">
        {ROWS.map((r) => (
          <div key={r.title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${r.badgeCls}`}>{r.badge}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-white leading-tight">{r.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{r.sub}</p>
            </div>
            {r.done ? (
              <span className="w-6 h-6 rounded-full bg-[#1F6E43] flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6l2.5 2.5L9.5 3.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            ) : (
              <span className="w-6 h-6 rounded-full border-2 border-white/20 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
