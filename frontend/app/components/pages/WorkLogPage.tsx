"use client";

import { useCallback, useEffect, useState } from "react";
import { WorkLogEntry } from "../../types";
import { ShimmerBox, ShimmerText } from "../Shimmer";

function groupByDay(entries: WorkLogEntry[]): { label: string; date: string; items: WorkLogEntry[] }[] {
  const map = new Map<string, WorkLogEntry[]>();
  for (const entry of entries) {
    const d = entry.occurred_on ?? entry.created_at;
    const key = new Date(d).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }
  return Array.from(map.entries()).map(([key, items]) => {
    const date = new Date(key);
    const label = formatDayLabel(date);
    return { label, date: key, items };
  });
}

function formatDayLabel(d: Date) {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.setDate(now.getDate() - 1)).toDateString();
  if (d.toDateString() === today) return "Today";
  if (d.toDateString() === yesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function EntryCard({ entry }: { entry: WorkLogEntry }) {
  const timestamp = entry.occurred_on ?? entry.created_at;
  const timeStr = new Date(timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="bg-white rounded-2xl px-4 py-3.5 flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#15161A] leading-snug">
          {entry.accomplishment ?? "—"}
        </p>
        {entry.impact && (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-gray-400">
              <path d="M2 9L6 3l4 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {entry.impact}
          </p>
        )}
        {entry.project && (
          <span className="self-start text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
            {entry.project}
          </span>
        )}
      </div>
      <span className="text-xs text-gray-400 font-mono shrink-0 mt-0.5">{timeStr}</span>
    </div>
  );
}

function ShimmerEntryGroup() {
  return (
    <div className="flex flex-col gap-2">
      <ShimmerBox className="h-3 w-24 mb-1" />
      {[0, 1].map((i) => (
        <div key={i} className="bg-white rounded-2xl px-4 py-3.5 flex flex-col gap-2">
          <ShimmerText lines={1} className="w-2/3" />
          <ShimmerBox className="h-3 w-1/2" />
          <ShimmerBox className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

interface WorkLogPageProps {
  token: string;
}

export function WorkLogPage({ token }: WorkLogPageProps) {
  const authHeader = { Authorization: `Bearer ${token}` };
  const [entries, setEntries] = useState<WorkLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const fetchEntries = useCallback(() => {
    fetch("/api/v1/work-log", { headers: authHeader })
      .then((r) => r.json())
      .then((data) => {
        setEntries(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const filtered = selectedProject
    ? entries.filter((e) => e.project === selectedProject)
    : entries;

  const groups = groupByDay(filtered);

  // Stats
  const totalEntries = entries.length;
  const withImpact = entries.filter((e) => e.impact).length;
  const projects = Array.from(new Set(entries.map((e) => e.project).filter(Boolean))) as string[];

  // Project counts
  const projectCounts = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p] = entries.filter((e) => e.project === p).length;
    return acc;
  }, {});

  // Date range
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const rangeLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-2xl font-black text-[#15161A]" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
              Work log
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{rangeLabel}</p>
          </div>
          <button
            onClick={fetchEntries}
            className="text-xs text-gray-400 hover:text-gray-600 transition mt-1.5"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-[1fr_220px] gap-6 mt-6">
          {/* Main content */}
          <div className="flex flex-col gap-6">
            {/* Stats row */}
            {!loading && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: totalEntries, label: "Entries" },
                  { value: withImpact, label: "With measured impact" },
                  { value: projects.length, label: "Projects" },
                ].map(({ value, label }) => (
                  <div key={label} className="bg-white rounded-2xl px-4 py-3">
                    <p className="text-2xl font-black text-[#15161A]">{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}
            {loading && (
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl px-4 py-3 flex flex-col gap-2">
                    <ShimmerBox className="h-7 w-10" />
                    <ShimmerBox className="h-3 w-20" />
                  </div>
                ))}
              </div>
            )}

            {/* Day groups */}
            {loading ? (
              <div className="flex flex-col gap-5">
                <ShimmerEntryGroup />
                <ShimmerEntryGroup />
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <p className="text-sm text-gray-400">
                  {selectedProject ? `No entries for "${selectedProject}".` : "No entries yet. Approve work log items to see them here."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {groups.map(({ label, date, items }) => (
                  <div key={date} className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                    {items.map((entry) => (
                      <EntryCard key={entry.id} entry={entry} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-4">
            {/* Projects filter */}
            <div className="bg-white rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-[#5C5F6A] uppercase tracking-wider mb-3">Projects</h3>
              {loading ? (
                <div className="flex flex-col gap-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex justify-between">
                      <ShimmerBox className="h-4 w-20" />
                      <ShimmerBox className="h-4 w-5" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => setSelectedProject(null)}
                    className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs transition ${
                      selectedProject === null ? "bg-[#4B3FE0]/10 text-[#4B3FE0] font-semibold" : "text-[#5C5F6A] hover:bg-gray-50"
                    }`}
                  >
                    <span>All projects</span>
                    <span className="font-bold">{totalEntries}</span>
                  </button>
                  {projects.map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelectedProject(p === selectedProject ? null : p)}
                      className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs transition ${
                        selectedProject === p ? "bg-[#4B3FE0]/10 text-[#4B3FE0] font-semibold" : "text-[#5C5F6A] hover:bg-gray-50"
                      }`}
                    >
                      <span>{p}</span>
                      <span className="font-bold">{projectCounts[p]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
