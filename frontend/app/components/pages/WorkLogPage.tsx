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
    <div className="bg-white rounded-2xl px-4 py-3.5 flex items-start justify-between gap-4 border border-gray-100">
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#15161A] leading-snug">
          {entry.accomplishment ?? "—"}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {entry.impact ? (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="shrink-0">
                <path d="M1.5 8.5L5 2.5l3.5 6" stroke="#6B7280" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {entry.impact}
            </p>
          ) : (
            <span className="text-xs text-gray-400">No impact yet · <span className="text-[#4B3FE0] cursor-pointer hover:underline">Add it</span></span>
          )}
          {entry.project && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
              {entry.project}
            </span>
          )}
        </div>
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

type Period = "week" | "month" | "quarter";

export function WorkLogPage({ token }: WorkLogPageProps) {
  const authHeader = { Authorization: `Bearer ${token}` };
  const [entries, setEntries] = useState<WorkLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("week");

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
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-[#15161A]" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
              Work log
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{rangeLabel}</p>
          </div>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {(["week", "month", "quarter"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-md transition capitalize ${
                  period === p ? "bg-[#15161A] text-white" : "text-[#5C5F6A] hover:bg-gray-100"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_220px] gap-6">
          {/* Main content */}
          <div className="flex flex-col gap-6">
            {/* Dark summary card */}
            {!loading && entries.length > 0 && (
              <div className="bg-[#15161A] rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <h2 className="text-sm font-bold text-white">Your week in three lines</h2>
                  <span className="text-xs text-gray-500">Drafted from {entries.length} approved entries</span>
                </div>
                <ol className="flex flex-col gap-2">
                  {entries.slice(0, 3).map((e, i) => (
                    <li key={e.id} className="text-sm text-gray-200 flex gap-2">
                      <span className="text-gray-500 shrink-0">{i + 1}.</span>
                      <span>{e.accomplishment}{e.impact ? `; ${e.impact.toLowerCase()}.` : "."}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-gray-500">Every line links back to what you said, so nothing is made up.</p>
                <div className="flex gap-2 flex-wrap pt-1">
                  {["Copy as resume bullets", "Draft review notes", "Turn into interview stories"].map((label) => (
                    <button key={label} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {loading && <ShimmerBox className="h-44 w-full rounded-2xl" />}

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
            {/* Impact CTA */}
            {!loading && entries.filter((e) => !e.impact).length > 0 && (
              <div className="bg-white rounded-2xl p-4 flex flex-col gap-2 border border-amber-100">
                <p className="text-sm font-bold text-[#15161A]">
                  {entries.filter((e) => !e.impact).length} {entries.filter((e) => !e.impact).length === 1 ? "entry needs" : "entries need"} impact
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">Add it while you still remember. Impact is what makes these useful at review time.</p>
                <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-[#4B3FE0] text-white hover:brightness-110 transition self-start mt-1">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="3.5" y="1" width="5" height="7" rx="2.5" stroke="white" strokeWidth="1.2" />
                    <path d="M1.5 6.5A4.5 4.5 0 0 0 10.5 6.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                    <line x1="6" y1="11" x2="6" y2="8.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  Answer out loud
                </button>
              </div>
            )}

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
