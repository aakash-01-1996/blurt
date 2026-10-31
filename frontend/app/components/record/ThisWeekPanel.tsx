"use client";

import { ShimmerBox } from "../Shimmer";
import { WeekStats } from "./types";

const WEEK_ROWS = [
  { key: "workLog" as const, label: "Work log", color: "bg-[#E8F1FD] text-[#0071E3]" },
  { key: "tasks" as const, label: "Tasks", color: "bg-[#FDF0E4] text-[#C2772B]" },
  { key: "lists" as const, label: "Lists", color: "bg-[#E7F5EC] text-[#2E8B57]" },
] as const;

interface ThisWeekPanelProps {
  stats: WeekStats;
  loading: boolean;
  onOpenWorkLog: () => void;
}

export function ThisWeekPanel({ stats, loading, onOpenWorkLog }: ThisWeekPanelProps) {
  return (
    <div className="bg-surface rounded-3xl p-6 flex flex-col gap-4 h-full border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div>
        <h2 className="font-display text-xl font-bold text-[#1D1D1F]">This week</h2>
        {loading ? (
          <ShimmerBox className="h-3.5 w-40 mt-2" />
        ) : (
          <p className="text-sm text-gray-400 mt-1">
            {stats.streak}-day streak · {stats.totalKept} item{stats.totalKept !== 1 ? "s" : ""} kept
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 mt-1">
          <ShimmerBox className="h-11 w-full rounded-xl" />
          <ShimmerBox className="h-11 w-full rounded-xl" />
          <ShimmerBox className="h-11 w-full rounded-xl" />
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-1">
          {WEEK_ROWS.map(({ key, label, color }) => (
            <div key={label} className={`flex items-center justify-between rounded-xl px-4 py-3 ${color}`}>
              <span className="text-sm font-bold">{label}</span>
              <span className="text-sm font-bold">{stats[key]}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onOpenWorkLog}
        className="text-sm font-bold text-[#0071E3] hover:underline text-left mt-auto pt-1 underline-offset-2"
      >
        Open this week&apos;s work log
      </button>
    </div>
  );
}
