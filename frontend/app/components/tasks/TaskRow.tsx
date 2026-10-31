"use client";

import { Task } from "../../types";
import { formatDueDate } from "../../lib/format";

export function TaskRow({ task, onToggle }: { task: Task; onToggle: (t: Task) => void }) {
  const done = task.status === "done";
  const overdue =
    !done && task.due_date != null && new Date(task.due_date) < new Date(new Date().toDateString());

  return (
    <div className="bg-surface rounded-2xl px-5 py-4 flex items-center gap-4 border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <button
        onClick={() => onToggle(task)}
        aria-pressed={done}
        aria-label={done ? "Mark as not done" : "Mark as done"}
        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition ${
          done ? "bg-[#34C759]" : "border-2 border-gray-300 hover:border-[#34C759]"
        }`}
      >
        {done && (
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2.5 6.5l2.5 2.5L10.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-[15px] font-semibold ${done ? "text-gray-400 line-through" : "text-[#1D1D1F]"}`}>
          {task.title}
        </p>
        {(task.due_date || task.project) && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.due_date && (
              <span className={`text-xs ${overdue ? "text-[#FF3B30] font-semibold" : "text-gray-400"}`}>
                {formatDueDate(task.due_date)}
              </span>
            )}
            {task.project && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#E8F1FD] text-[#0071E3]">
                {task.project}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
