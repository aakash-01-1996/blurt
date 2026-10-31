"use client";

export type FilterSection = "all" | "work_log" | "task" | "list" | "unsorted";

const FILTERS: { key: FilterSection; label: string; color: string }[] = [
  { key: "all", label: "All", color: "text-white" },
  { key: "work_log", label: "Work log", color: "text-[#0071E3]" },
  { key: "task", label: "Tasks", color: "text-[#C2772B]" },
  { key: "list", label: "New list", color: "text-[#2E8B57]" },
  { key: "unsorted", label: "Unsorted", color: "text-gray-500" },
];

interface ReviewFiltersProps {
  counts: Record<FilterSection, number>;
  value: FilterSection;
  onChange: (f: FilterSection) => void;
}

export function ReviewFilters({ counts, value, onChange }: ReviewFiltersProps) {
  return (
    <div className="flex gap-2 my-6 flex-wrap">
      {FILTERS.filter(({ key }) => counts[key] > 0 || key === "all").map(({ key, label, color }) => {
        const on = value === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`text-sm font-bold px-4 py-2 rounded-full border transition ${
              on ? "bg-[#1D1D1F] text-white border-[#1D1D1F]" : "bg-surface border-[#E5E5EA] hover:bg-raised"
            }`}
          >
            <span className={on ? "text-white" : color}>{label}</span>
            <span className={on ? "text-white/60" : "text-gray-300"}> · {counts[key]}</span>
          </button>
        );
      })}
    </div>
  );
}
