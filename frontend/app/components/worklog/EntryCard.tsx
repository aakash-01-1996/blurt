"use client";

import { WorkLogEntry } from "../../types";

function PlayPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs text-gray-500 bg-surface border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-full pl-2.5 pr-3 py-1.5 shrink-0">
      <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor"><path d="M0 0l9 5-9 5z" /></svg>
      {label}
    </span>
  );
}

export function EntryCard({ entry }: { entry: WorkLogEntry }) {
  const timestamp = entry.occurred_on ?? entry.created_at;
  const timeStr = new Date(timestamp)
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(/\s?[AP]M/, "");

  return (
    <div className="bg-surface rounded-2xl px-5 py-4 flex items-start justify-between gap-4 border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-2.5 flex-1 min-w-0">
        <p className="text-[15px] font-bold text-[#1D1D1F] leading-snug">{entry.accomplishment ?? "—"}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {entry.impact ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-raised rounded-full px-2.5 py-1">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="shrink-0">
                <path d="M2 9l3-3 2 2 3-4" stroke="#6B7280" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8.5 4H10v1.5" stroke="#6B7280" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {entry.impact}
            </span>
          ) : (
            <span className="inline-flex items-center text-xs font-medium text-gray-400 border border-dashed border-[#D2D2D7] rounded-full px-2.5 py-1">
              No impact yet · <span className="text-[#0071E3] cursor-pointer hover:underline ml-1">Add it</span>
            </span>
          )}
          {entry.project && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#E8F1FD] text-[#0071E3]">
              {entry.project}
            </span>
          )}
        </div>
      </div>
      <PlayPill label={timeStr} />
    </div>
  );
}
