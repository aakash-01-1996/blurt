"use client";

import { useState } from "react";
import { Page } from "../types";
import { Sidebar } from "./Sidebar";
import { RecordPage } from "./pages/RecordPage";
import { ReviewPage } from "./pages/ReviewPage";
import { WorkLogPage } from "./pages/WorkLogPage";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-gray-400">{title} — coming soon</p>
    </div>
  );
}

export function AppShell({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [activePage, setActivePage] = useState<Page>("record");
  const [reviewCount, setReviewCount] = useState(0);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        reviewCount={reviewCount}
        onLogout={onLogout}
      />
      <main className="flex-1 min-w-0 bg-canvas">
        {activePage === "record" && (
          <RecordPage token={token} onNavigateReview={() => setActivePage("review")} />
        )}
        {activePage === "review" && (
          <ReviewPage token={token} onCountChange={setReviewCount} />
        )}
        {activePage === "work-log" && <WorkLogPage token={token} />}
        {activePage === "tasks" && <PlaceholderPage title="Tasks" />}
        {activePage === "lists" && <PlaceholderPage title="Lists" />}
        {activePage === "settings" && <PlaceholderPage title="Settings" />}
      </main>
    </div>
  );
}
