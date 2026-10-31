import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Sidebar } from "../components/Sidebar";

function setup(overrides: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  const onNavigate = vi.fn();
  const onLogout = vi.fn();
  render(
    <Sidebar activePage="record" onNavigate={onNavigate} reviewCount={3} onLogout={onLogout} {...overrides} />
  );
  return { onNavigate, onLogout };
}

describe("Sidebar", () => {
  it("renders every nav item", () => {
    setup();
    ["Record", "Review inbox", "Work log", "Tasks", "Lists", "Settings"].forEach((label) =>
      expect(screen.getByText(label)).toBeInTheDocument()
    );
  });

  it("shows the review badge when there are pending items", () => {
    setup({ reviewCount: 5 });
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("hides the badge at zero", () => {
    setup({ reviewCount: 0 });
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("navigates on click", () => {
    const { onNavigate } = setup();
    fireEvent.click(screen.getByText("Work log"));
    expect(onNavigate).toHaveBeenCalledWith("work-log");
  });

  it("logs out", () => {
    const { onLogout } = setup();
    fireEvent.click(screen.getByText("Log out"));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("no longer renders the Local mode card", () => {
    setup();
    expect(screen.queryByText("Local mode")).not.toBeInTheDocument();
  });
});
