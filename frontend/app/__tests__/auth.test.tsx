import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Logo } from "../components/auth/Logo";
import { FeatureCards } from "../components/auth/FeatureCards";
import { DemoCard } from "../components/auth/DemoCard";
import { BrandPanel } from "../components/auth/BrandPanel";
import { AuthForm } from "../components/auth/AuthForm";

describe("branding pieces", () => {
  it("Logo renders the wordmark", () => {
    render(<Logo />);
    expect(screen.getByText("blurt")).toBeInTheDocument();
  });

  it("FeatureCards lists the three steps", () => {
    render(<FeatureCards />);
    ["Talk", "Review", "Keep"].forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
  });

  it("DemoCard shows the sorted memo", () => {
    render(<DemoCard />);
    expect(screen.getByText("Sorted into 3 items")).toBeInTheDocument();
    expect(screen.getByText("Shipped the retry fix")).toBeInTheDocument();
  });

  it("BrandPanel swaps content by mode", () => {
    const { rerender } = render(<BrandPanel mode="login" />);
    expect(screen.getByText(/Talk for a minute about your day/)).toBeInTheDocument();
    expect(screen.getByText("Sorted into 3 items")).toBeInTheDocument();
    rerender(<BrandPanel mode="signup" />);
    expect(screen.getByText("Talk")).toBeInTheDocument();
  });
});

describe("AuthForm", () => {
  function submit() {
    fireEvent.submit(screen.getByPlaceholderText("name@example.com").closest("form")!);
  }

  it("renders the sign-in view", () => {
    render(<AuthForm mode="login" onModeChange={vi.fn()} onAuth={vi.fn()} />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("Keep me signed in on this device")).toBeInTheDocument();
  });

  it("renders the sign-up view with a name field", () => {
    render(<AuthForm mode="signup" onModeChange={vi.fn()} onAuth={vi.fn()} />);
    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText(/12 or more characters/)).toBeInTheDocument();
  });

  it("toggles password visibility", () => {
    render(<AuthForm mode="login" onModeChange={vi.fn()} onAuth={vi.fn()} />);
    const pw = screen.getByPlaceholderText("Enter your password");
    expect(pw).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByText("Show"));
    expect(pw).toHaveAttribute("type", "text");
  });

  it("switches mode via the segmented control", () => {
    const onModeChange = vi.fn();
    render(<AuthForm mode="login" onModeChange={onModeChange} onAuth={vi.fn()} />);
    fireEvent.click(screen.getByText("Create account"));
    expect(onModeChange).toHaveBeenCalledWith("signup");
  });

  it("submits credentials and reports the token", async () => {
    const onAuth = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: "tok" }) });
    render(<AuthForm mode="login" onModeChange={vi.fn()} onAuth={onAuth} />);
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), { target: { value: "secret" } });
    submit();
    await waitFor(() => expect(onAuth).toHaveBeenCalledWith("tok"));
    expect(global.fetch).toHaveBeenCalledWith("/api/v1/auth/login", expect.objectContaining({ method: "POST" }));
  });

  it("shows an error on a failed sign-in", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ detail: "Invalid credentials" }) });
    render(<AuthForm mode="login" onModeChange={vi.fn()} onAuth={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), { target: { value: "x" } });
    submit();
    await waitFor(() => expect(screen.getByText("Invalid credentials")).toBeInTheDocument());
  });
});
