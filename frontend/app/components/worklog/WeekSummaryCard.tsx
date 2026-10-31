"use client";

import { WorkLogEntry } from "../../types";

const ACTIONS = ["Draft review notes", "Turn into interview stories"];

/** The dark "Your week in three lines" summary card. */
export function WeekSummaryCard({ entries }: { entries: WorkLogEntry[] }) {
  return (
    <div className="bg-[#1D1D1F] rounded-3xl p-7 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-white">Your week in three lines</h2>
        <span className="text-sm text-gray-400 shrink-0 mt-1">Drafted from {entries.length} approved entries</span>
      </div>
      <ol className="flex flex-col gap-3">
        {entries.slice(0, 3).map((e, i) => (
          <li key={e.id} className="text-[15px] text-gray-200 flex gap-2.5 leading-relaxed">
            <span className="text-gray-500 shrink-0">{i + 1}.</span>
            <span>{e.accomplishment}{e.impact ? `; ${e.impact.toLowerCase()}.` : "."}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm text-gray-500">Every line links back to what you said, so nothing is made up.</p>
      <div className="flex gap-2.5 flex-wrap pt-1">
        <button className="text-sm font-bold px-4 py-2.5 rounded-xl bg-surface text-[#1D1D1F] hover:bg-raised transition">
          Copy as resume bullets
        </button>
        {ACTIONS.map((label) => (
          <button key={label} className="text-sm font-bold px-4 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition">
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
