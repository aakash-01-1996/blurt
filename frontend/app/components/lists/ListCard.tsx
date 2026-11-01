"use client";

import { List, ListItem } from "../../types";

interface ListCardProps {
  list: List;
  onToggleItem: (list: List, item: ListItem) => void;
  onDelete: (list: List) => void;
}

export function ListCard({ list, onToggleItem, onDelete }: ListCardProps) {
  const checked = list.items.filter((i) => i.checked).length;

  return (
    <div className="bg-surface rounded-2xl px-5 py-4 border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[#1D1D1F] truncate">{list.title}</p>
          {list.items.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {checked}/{list.items.length} done
            </p>
          )}
        </div>
        <button
          onClick={() => onDelete(list)}
          aria-label="Delete list"
          className="shrink-0 text-[#A3A7B2] hover:text-[#FF3B30] transition-colors p-1 -m-1"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3.5 5h11M7 5V3.5h4V5M6 5v9.5h6V5M7.5 7.5v5M10.5 7.5v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {list.items.length === 0 ? (
        <p className="text-sm text-gray-400">No items.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {list.items.map((it) => (
            <li key={it.id} className="flex items-center gap-3">
              <button
                onClick={() => onToggleItem(list, it)}
                aria-pressed={it.checked}
                aria-label={it.checked ? `Uncheck ${it.text}` : `Check ${it.text}`}
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition ${
                  it.checked ? "bg-[#2E8B57]" : "border-2 border-gray-300 hover:border-[#2E8B57]"
                }`}
              >
                {it.checked && (
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2 5.5l2 2L9 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className={`text-[15px] ${it.checked ? "text-gray-400 line-through" : "text-[#1D1D1F]"}`}>
                {it.text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
