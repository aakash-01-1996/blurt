import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ListCard } from "../components/lists/ListCard";
import { ListsPage } from "../components/pages/ListsPage";
import { List } from "../types";

const ok = (data: unknown) => Promise.resolve({ ok: true, json: async () => data } as Response);

function list(over: Partial<List> = {}): List {
  return {
    id: "l1",
    item_id: "i1",
    title: "Groceries",
    created_at: "2026-10-29T00:00:00Z",
    items: [
      { id: "it1", text: "Milk", checked: false, position: 0 },
      { id: "it2", text: "Eggs", checked: true, position: 1 },
    ],
    ...over,
  };
}

describe("ListCard", () => {
  it("renders title, items and done count", () => {
    render(<ListCard list={list()} onToggleItem={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Eggs")).toBeInTheDocument();
    expect(screen.getByText("1/2 done")).toBeInTheDocument();
  });

  it("toggles an item", () => {
    const onToggleItem = vi.fn();
    render(<ListCard list={list()} onToggleItem={onToggleItem} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Check Milk" }));
    expect(onToggleItem).toHaveBeenCalledTimes(1);
  });

  it("deletes the list", () => {
    const onDelete = vi.fn();
    render(<ListCard list={list()} onToggleItem={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete list" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe("ListsPage", () => {
  it("lists lists with a count", async () => {
    global.fetch = vi.fn(() => ok([list()])) as typeof fetch;
    render(<ListsPage token="t" />);
    expect(await screen.findByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("1 list")).toBeInTheDocument();
  });

  it("renders an empty state", async () => {
    global.fetch = vi.fn(() => ok([])) as typeof fetch;
    render(<ListsPage token="t" />);
    expect(await screen.findByText(/No lists yet/)).toBeInTheDocument();
  });

  it("toggles an item through the API", async () => {
    let patched = false;
    global.fetch = vi.fn((_url: string | URL | Request, opts?: RequestInit) => {
      if (opts?.method === "PATCH") {
        patched = true;
        return ok({ id: "it1", text: "Milk", checked: true, position: 0 });
      }
      return ok([list()]);
    }) as typeof fetch;

    render(<ListsPage token="t" />);
    await screen.findByText("Milk");
    fireEvent.click(screen.getByRole("button", { name: "Check Milk" }));
    await waitFor(() => expect(patched).toBe(true));
  });

  it("deletes a list through the API", async () => {
    let deleted = false;
    global.fetch = vi.fn((_url: string | URL | Request, opts?: RequestInit) => {
      if (opts?.method === "DELETE") {
        deleted = true;
        return ok(null);
      }
      return ok([list()]);
    }) as typeof fetch;

    render(<ListsPage token="t" />);
    await screen.findByText("Groceries");
    fireEvent.click(screen.getByRole("button", { name: "Delete list" }));
    await waitFor(() => expect(deleted).toBe(true));
    await waitFor(() => expect(screen.queryByText("Groceries")).not.toBeInTheDocument());
  });
});
