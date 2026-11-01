import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NoteCard } from "../components/notes/NoteCard";
import { NotesPage } from "../components/pages/NotesPage";
import { Note } from "../types";

const ok = (data: unknown) => Promise.resolve({ ok: true, json: async () => data } as Response);

function note(over: Partial<Note> = {}): Note {
  return {
    id: "n1",
    item_id: "i1",
    title: "API rate limit",
    content: "60 requests per minute.",
    created_at: "2026-10-29T00:00:00Z",
    ...over,
  };
}

describe("NoteCard", () => {
  it("renders title and content", () => {
    render(<NoteCard note={note()} onDelete={vi.fn()} />);
    expect(screen.getByText("API rate limit")).toBeInTheDocument();
    expect(screen.getByText("60 requests per minute.")).toBeInTheDocument();
  });

  it("hides content when it duplicates the title", () => {
    render(<NoteCard note={note({ title: "Same", content: "Same" })} onDelete={vi.fn()} />);
    expect(screen.getAllByText("Same")).toHaveLength(1);
  });

  it("calls onDelete", () => {
    const onDelete = vi.fn();
    render(<NoteCard note={note()} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete note" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe("NotesPage", () => {
  it("lists notes and shows the count", async () => {
    const notes = [note({ id: "n1" }), note({ id: "n2", title: "Dark mode idea" })];
    global.fetch = vi.fn(() => ok(notes)) as typeof fetch;

    render(<NotesPage token="t" />);
    expect(await screen.findByText("API rate limit")).toBeInTheDocument();
    expect(screen.getByText("2 notes")).toBeInTheDocument();
  });

  it("renders an empty state", async () => {
    global.fetch = vi.fn(() => ok([])) as typeof fetch;
    render(<NotesPage token="t" />);
    expect(await screen.findByText(/No notes yet/)).toBeInTheDocument();
  });

  it("deletes a note through the API", async () => {
    const notes = [note({ id: "n1" })];
    let deleted = false;
    global.fetch = vi.fn((_url: string | URL | Request, opts?: RequestInit) => {
      if (opts?.method === "DELETE") {
        deleted = true;
        return ok(null);
      }
      return ok(notes);
    }) as typeof fetch;

    render(<NotesPage token="t" />);
    await screen.findByText("API rate limit");
    fireEvent.click(screen.getByRole("button", { name: "Delete note" }));
    await waitFor(() => expect(deleted).toBe(true));
    await waitFor(() =>
      expect(screen.queryByText("API rate limit")).not.toBeInTheDocument()
    );
  });
});
