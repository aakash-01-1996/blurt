"use client";

import { Page } from "../types";

const NAV_ITEMS: { page: Page; label: string; icon: React.ReactNode }[] = [
  {
    page: "record",
    label: "Record",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="5" y="1" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 8.5A6 6 0 0 0 14 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="14.5" x2="8" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    page: "review",
    label: "Review inbox",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="3.5" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 9.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    page: "work-log",
    label: "Work log",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="1.5" width="12" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 5.5h6M5 8h6M5 10.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    page: "tasks",
    label: "Tasks",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="2.5" cy="4.5" r="1" fill="currentColor" />
        <circle cx="2.5" cy="8" r="1" fill="currentColor" />
        <circle cx="2.5" cy="11.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    page: "settings",
    label: "Settings",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        />
      </svg>
    ),
  },
];

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  reviewCount: number;
  onLogout: () => void;
}

export function Sidebar({ activePage, onNavigate, reviewCount, onLogout }: SidebarProps) {
  return (
    <aside className="w-[148px] min-h-screen bg-white flex flex-col border-r border-gray-100 shrink-0">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#4B3FE0] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="2" width="3" height="10" rx="1" fill="white" />
              <rect x="6.5" y="5" width="3" height="7" rx="1" fill="white" />
              <rect x="11" y="3.5" width="3" height="8.5" rx="1" fill="white" />
            </svg>
          </div>
          <span className="text-sm font-black text-[#15161A]" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
            blurt
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {NAV_ITEMS.map(({ page, label, icon }) => {
          const active = activePage === page;
          const badge = page === "review" && reviewCount > 0 ? reviewCount : null;
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={`flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                active
                  ? "bg-[#4B3FE0]/10 text-[#4B3FE0]"
                  : "text-[#5C5F6A] hover:bg-gray-100 hover:text-[#15161A]"
              }`}
            >
              <span className={active ? "text-[#4B3FE0]" : "text-[#9CA3AF]"}>{icon}</span>
              <span className="flex-1">{label}</span>
              {badge !== null && (
                <span className="text-[10px] font-bold bg-[#4B3FE0] text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Local mode badge + logout */}
      <div className="px-3 pb-5 flex flex-col gap-2">
        <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
          <div className="flex items-center gap-1.5 mb-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="4" width="10" height="7" rx="1" stroke="#9CA3AF" strokeWidth="1.2" />
              <path d="M4 4V3a2 2 0 1 1 4 0v1" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="text-[10px] font-semibold text-[#5C5F6A]">Local mode</span>
          </div>
          <p className="text-[10px] text-gray-400 leading-tight">Audio and AI stay on this Mac.</p>
        </div>
        <button
          onClick={onLogout}
          className="text-[10px] text-gray-400 hover:text-gray-600 transition text-left px-1"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
