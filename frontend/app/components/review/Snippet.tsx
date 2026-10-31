"use client";

import { fmtTime } from "../../lib/format";

/** The "▶ 0:03  'quote'" source-audio snippet shown inside review cards. */
export function Snippet({ ts, text }: { ts: number; text: string }) {
  return (
    <div className="bg-raised rounded-2xl px-3.5 py-3 flex items-start gap-3">
      <span className="flex items-center gap-1.5 font-mono text-xs text-gray-500 bg-surface border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-lg px-2 py-1 shrink-0">
        <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor"><path d="M0 0l8 4.5L0 9z" /></svg>
        {fmtTime(ts)}
      </span>
      <p className="text-[15px] text-gray-500 leading-relaxed pt-0.5">&ldquo;{text}&rdquo;</p>
    </div>
  );
}
