import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication: vi.fn(async () => ({ id: "cred-assertion" })),
  startRegistration: vi.fn(async () => ({ id: "cred-attestation" })),
}));

import { loginWithPasskey } from "../lib/passkey";
import { PasskeysCard } from "../components/settings/PasskeysCard";
import { AuthForm } from "../components/auth/AuthForm";

const ok = (data: unknown) => Promise.resolve({ ok: true, json: async () => data } as Response);
const fail = (status: number, detail: string) =>
  Promise.resolve({ ok: false, status, json: async () => ({ detail }) } as Response);

beforeEach(() => {
  // jsdom has no WebAuthn; pretend the browser supports it.
  (window as unknown as { PublicKeyCredential: unknown }).PublicKeyCredential = function () {};
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as unknown as { PublicKeyCredential?: unknown }).PublicKeyCredential;
});

describe("loginWithPasskey", () => {
  it("runs begin → assertion → complete and returns the token", async () => {
    global.fetch = vi.fn((url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("login/begin")) return ok({ options: {}, challenge_token: "ct" });
      if (u.includes("login/complete")) return ok({ access_token: "JWT123" });
      return fail(500, "unexpected");
    }) as typeof fetch;

    await expect(loginWithPasskey("a@b.com")).resolves.toBe("JWT123");
  });

  it("surfaces the server detail when begin fails", async () => {
    global.fetch = vi.fn(() => fail(404, "No passkey found for this account")) as typeof fetch;
    await expect(loginWithPasskey("a@b.com")).rejects.toThrow("No passkey found");
  });
});

describe("PasskeysCard", () => {
  it("lists passkeys and adds one", async () => {
    let added = false;
    global.fetch = vi.fn((url: string | URL | Request, opts?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/credentials") && (!opts || opts.method === undefined)) {
        return ok(
          added
            ? [{ id: "c1", label: "MacBook", created_at: "2026-10-30T00:00:00Z", last_used_at: null }]
            : []
        );
      }
      if (u.includes("register/begin")) return ok({ options: {}, challenge_token: "ct" });
      if (u.includes("register/complete")) {
        added = true;
        return ok({ id: "c1", label: "MacBook", created_at: "2026-10-30T00:00:00Z", last_used_at: null });
      }
      return fail(500, "unexpected");
    }) as typeof fetch;

    render(<PasskeysCard token="t" />);
    fireEvent.click(screen.getByRole("button", { name: "Add a passkey" }));
    expect(await screen.findByText("MacBook")).toBeInTheDocument();
  });
});

describe("AuthForm passkey button", () => {
  function renderLogin() {
    render(<AuthForm mode="login" onModeChange={vi.fn()} onAuth={vi.fn()} />);
  }

  it("prompts for email before a passkey sign-in", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /Sign in with a passkey/ }));
    expect(await screen.findByText(/Enter your email/)).toBeInTheDocument();
  });

  it("explains passkeys are added after signup", async () => {
    render(<AuthForm mode="signup" onModeChange={vi.fn()} onAuth={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Sign up with a passkey/ }));
    expect(await screen.findByText(/Create your account first/)).toBeInTheDocument();
  });

  it("signs in with a passkey and passes the token up", async () => {
    const onAuth = vi.fn();
    global.fetch = vi.fn((url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("login/begin")) return ok({ options: {}, challenge_token: "ct" });
      if (u.includes("login/complete")) return ok({ access_token: "JWT999" });
      return fail(500, "unexpected");
    }) as typeof fetch;

    render(<AuthForm mode="login" onModeChange={vi.fn()} onAuth={onAuth} />);
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "a@b.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign in with a passkey/ }));
    await waitFor(() => expect(onAuth).toHaveBeenCalledWith("JWT999"));
  });
});
