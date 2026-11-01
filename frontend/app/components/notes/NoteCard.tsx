"use client";

import { Note } from "../../types";
import { formatDayLabel } from "../../lib/format";

export function NoteCard({ note, onDelete }: { note: Note; onDelete: (n: Note) => void }) {
  return (
    <div className="bg-surface rounded-2xl px-5 py-4 flex items-start gap-4 border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[#1D1D1F]">{note.title}</p>
        {note.content && note.content !== note.title && (
          <p className="text-sm text-[#6E6E73] mt-1 whitespace-pre-wrap break-words">
            {note.content}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-2">{formatDayLabel(new Date(note.created_at))}</p>
      </div>

      <button
        onClick={() => onDelete(note)}
        aria-label="Delete note"
        className="shrink-0 text-[#A3A7B2] hover:text-[#FF3B30] transition-colors p-1 -m-1"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3.5 5h11M7 5V3.5h4V5M6 5v9.5h6V5M7.5 7.5v5M10.5 7.5v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
