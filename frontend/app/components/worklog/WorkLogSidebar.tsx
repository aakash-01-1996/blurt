"use client";

import { ShimmerBox } from "../Shimmer";

interface WorkLogSidebarProps {
  loading: boolean;
  needImpact: number;
  totalEntries: number;
  projects: string[];
  projectCounts: Record<string, number>;
  selectedProject: string | null;
  onSelectProject: (p: string | null) => void;
}

/** Right rail: "needs impact" CTA + the Projects filter list. */
export function WorkLogSidebar({
  loading,
  needImpact,
  totalEntries,
  projects,
  projectCounts,
  selectedProject,
  onSelectProject,
}: WorkLogSidebarProps) {
  return (
    <div className="flex flex-col gap-5">
      {!loading && needImpact > 0 && (
        <div className="bg-[#E8F1FD] rounded-3xl p-6 flex flex-col gap-3">
          <p className="font-display text-xl font-bold text-[#1D1D1F]">
            {needImpact} {needImpact === 1 ? "entry needs" : "entries need"} impact
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            Add it while you still remember. Impact is what makes these useful at review time.
          </p>
          <button className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl bg-[#0071E3] text-white hover:brightness-110 transition self-start mt-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="4.5" y="1" width="5" height="7.5" rx="2.5" stroke="white" strokeWidth="1.3" />
              <path d="M2 7A5 5 0 0 0 12 7" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="7" y1="13" x2="7" y2="10" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Answer out loud
          </button>
        </div>
      )}

      <div className="bg-surface rounded-3xl p-6 border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h3 className="font-display text-xl font-bold text-[#1D1D1F] mb-4">Projects</h3>
        {loading ? (
          <div className="flex flex-col gap-2.5">
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
              onClick={() => onSelectProject(null)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-[15px] transition ${
                selectedProject === null ? "bg-raised text-[#1D1D1F] font-bold" : "text-[#6E6E73] hover:bg-raised"
              }`}
            >
              <span>All projects</span>
              <span className="font-bold">{totalEntries}</span>
            </button>
            {projects.map((p) => (
              <button
                key={p}
                onClick={() => onSelectProject(p === selectedProject ? null : p)}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-[15px] transition ${
                  selectedProject === p ? "bg-[#E8F1FD] text-[#0071E3] font-bold" : "text-[#6E6E73] hover:bg-raised"
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
  );
}
