import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TaskRow } from "../components/tasks/TaskRow";
import { TasksPage } from "../components/pages/TasksPage";
import { Task } from "../types";

const ok = (data: unknown) => Promise.resolve({ ok: true, json: async () => data } as Response);

function task(over: Partial<Task> = {}): Task {
  return {
    id: "t1",
    item_id: "i1",
    title: "Call the dentist",
    due_date: "2026-11-03T12:00:00",
    project: "personal",
    status: "open",
    completed_at: null,
    created_at: "2026-10-29T00:00:00Z",
    ...over,
  };
}

describe("TaskRow", () => {
  it("renders title, due date and project", () => {
    render(<TaskRow task={task()} onToggle={vi.fn()} />);
    expect(screen.getByText("Call the dentist")).toBeInTheDocument();
    expect(screen.getByText("personal")).toBeInTheDocument();
    expect(screen.getByText(/Nov 3/)).toBeInTheDocument();
  });

  it("toggles on checkbox click", () => {
    const onToggle = vi.fn();
    render(<TaskRow task={task()} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Mark as done" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("reflects the done state", () => {
    render(<TaskRow task={task({ status: "done" })} onToggle={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Mark as not done" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });
});

describe("TasksPage", () => {
  it("groups tasks and shows counts", async () => {
    const tasks = [task({ id: "t1" }), task({ id: "t2", title: "Finish report", status: "done" })];
    global.fetch = vi.fn(() => ok(tasks)) as typeof fetch;

    render(<TasksPage token="t" />);
    expect(await screen.findByText("Call the dentist")).toBeInTheDocument();
    expect(screen.getByText("1 open · 1 done")).toBeInTheDocument();
    expect(screen.getByText("To do")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders an empty state", async () => {
    global.fetch = vi.fn(() => ok([])) as typeof fetch;
    render(<TasksPage token="t" />);
    expect(await screen.findByText(/No tasks yet/)).toBeInTheDocument();
  });

  it("toggles a task through the API", async () => {
    const tasks = [task({ id: "t1" })];
    let patched = false;
    global.fetch = vi.fn((_url: string | URL | Request, opts?: RequestInit) => {
      if (opts?.method === "PATCH") {
        patched = true;
        return ok({ ...tasks[0], status: "done", completed_at: "2026-10-31T00:00:00Z" });
      }
      return ok(tasks);
    }) as typeof fetch;

    render(<TasksPage token="t" />);
    await screen.findByText("Call the dentist");
    fireEvent.click(screen.getByRole("button", { name: "Mark as done" }));
    await waitFor(() => expect(patched).toBe(true));
  });
});
