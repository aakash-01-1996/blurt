import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EntryCard } from "../components/worklog/EntryCard";
import { WeekSummaryCard } from "../components/worklog/WeekSummaryCard";
import { WorkLogSidebar } from "../components/worklog/WorkLogSidebar";
import { WorkLogEntry } from "../types";

function entry(over: Partial<WorkLogEntry> = {}): WorkLogEntry {
  return {
    id: "e1",
    item_id: "i1",
    accomplishment: "Shipped retry fix",
    impact: "down 30%",
    project: "Upload",
    occurred_on: "2026-10-29T15:03:00Z",
    created_at: "2026-10-29T15:03:00Z",
    ...over,
  };
}

describe("EntryCard", () => {
  it("renders the accomplishment, impact and project", () => {
    render(<EntryCard entry={entry()} />);
    expect(screen.getByText("Shipped retry fix")).toBeInTheDocument();
    expect(screen.getByText("down 30%")).toBeInTheDocument();
    expect(screen.getByText("Upload")).toBeInTheDocument();
  });

  it("prompts to add impact when missing", () => {
    render(<EntryCard entry={entry({ impact: null })} />);
    expect(screen.getByText(/No impact yet/)).toBeInTheDocument();
    expect(screen.getByText("Add it")).toBeInTheDocument();
  });
});

describe("WeekSummaryCard", () => {
  const entries = [1, 2, 3, 4].map((i) => entry({ id: `e${i}`, accomplishment: `Did thing ${i}`, impact: null, project: null }));

  it("renders the first three lines and action buttons", () => {
    render(<WeekSummaryCard entries={entries} />);
    expect(screen.getByText("Your week in three lines")).toBeInTheDocument();
    expect(screen.getByText("Drafted from 4 approved entries")).toBeInTheDocument();
    expect(screen.getByText(/Did thing 1/)).toBeInTheDocument();
    expect(screen.queryByText(/Did thing 4/)).not.toBeInTheDocument();
    expect(screen.getByText("Copy as resume bullets")).toBeInTheDocument();
  });
});

describe("WorkLogSidebar", () => {
  const props = {
    loading: false,
    needImpact: 2,
    totalEntries: 8,
    projects: ["Upload", "CI"],
    projectCounts: { Upload: 3, CI: 1 },
    selectedProject: null,
    onSelectProject: vi.fn(),
  };

  it("shows the impact CTA and project list", () => {
    render(<WorkLogSidebar {...props} />);
    expect(screen.getByText("2 entries need impact")).toBeInTheDocument();
    expect(screen.getByText("All projects")).toBeInTheDocument();
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("selects a project", () => {
    const onSelectProject = vi.fn();
    render(<WorkLogSidebar {...props} onSelectProject={onSelectProject} />);
    fireEvent.click(screen.getByText("Upload"));
    expect(onSelectProject).toHaveBeenCalledWith("Upload");
  });

  it("hides the CTA when nothing needs impact", () => {
    render(<WorkLogSidebar {...props} needImpact={0} />);
    expect(screen.queryByText(/need impact/)).not.toBeInTheDocument();
  });
});
