import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RecordPage } from "../components/pages/RecordPage";
import { ReviewPage } from "../components/pages/ReviewPage";
import { WorkLogPage } from "../components/pages/WorkLogPage";
import { AppShell } from "../components/AppShell";
import { Item, Recording, WorkLogEntry } from "../types";

const ok = (data: unknown) => Promise.resolve({ ok: true, json: async () => data } as Response);

function recording(over: Partial<Recording> = {}): Recording {
  return { id: "r1", status: "ready", duration_s: 41, created_at: new Date().toISOString(), ...over };
}
function item(over: Partial<Item> = {}): Item {
  return {
    id: "i1",
    section: "work_log",
    status: "pending",
    span_text: "I shipped the fix",
    route_confidence: 0.9,
    start_s: null,
    end_s: null,
    fields: { accomplishment: "Shipped fix", impact: "down 30%", project: "Upload" },
    followup_question: null,
    ...over,
  };
}

describe("RecordPage", () => {
  it("loads recordings and derives the weekly rollup", async () => {
    global.fetch = vi.fn((url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith("/items")) return ok([item({ status: "approved" })]);
      if (u.includes("/summaries")) return ok([]);
      if (u.includes("/recordings")) return ok([recording()]);
      return ok([]);
    }) as typeof fetch;

    render(<RecordPage token="t" onNavigateReview={vi.fn()} />);
    expect(await screen.findByText("Recent blurts")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/day streak/)).toBeInTheDocument());
  });
});

describe("ReviewPage", () => {
  it("renders the transcript and item card, then approves", async () => {
    let approved = false;
    global.fetch = vi.fn((url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("/review")) { approved = true; return ok({ ...item(), status: "approved" }); }
      if (u.includes("/audio-url")) return ok({ url: "blob:x" });
      if (u.endsWith("/items")) return ok([item()]);
      if (u.includes("/recordings")) return ok([recording()]);
      return ok([]);
    }) as typeof fetch;

    render(<ReviewPage token="t" onCountChange={vi.fn()} />);
    expect(await screen.findByText("What you said")).toBeInTheDocument();
    expect(await screen.findByText("Shipped fix")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Approve"));
    await waitFor(() => expect(approved).toBe(true));
  });
});

describe("WorkLogPage", () => {
  it("renders the summary, entries and projects", async () => {
    const entries: WorkLogEntry[] = [
      { id: "e1", item_id: "i1", accomplishment: "Shipped retry fix", impact: "down 30%", project: "Upload", occurred_on: "2026-10-29T15:00:00Z", created_at: "2026-10-29T15:00:00Z" },
      { id: "e2", item_id: "i2", accomplishment: "Fixed tests", impact: null, project: "CI", occurred_on: "2026-10-28T10:00:00Z", created_at: "2026-10-28T10:00:00Z" },
    ];
    global.fetch = vi.fn(() => ok(entries)) as typeof fetch;

    render(<WorkLogPage token="t" />);
    expect(await screen.findByText("Your week in three lines")).toBeInTheDocument();
    expect(screen.getByText("Shipped retry fix")).toBeInTheDocument();
    expect(screen.getByText("All projects")).toBeInTheDocument();
  });
});

describe("AppShell", () => {
  it("switches between pages from the sidebar", async () => {
    global.fetch = vi.fn(() => ok([])) as typeof fetch;
    render(<AppShell token="t" onLogout={vi.fn()} />);

    expect(await screen.findByText("Recent blurts")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Work log" }));
    expect(await screen.findByRole("heading", { name: "Work log" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
    expect(await screen.findByRole("heading", { name: "Tasks" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lists" }));
    expect(screen.getByText(/coming soon/)).toBeInTheDocument();
  });
});
