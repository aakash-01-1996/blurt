"use client";

import { useState } from "react";

interface AuthGateProps {
  onAuth: (token: string) => void;
}

export default function AuthGate({ onAuth }: AuthGateProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/signup";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body?.detail ?? "Something went wrong");
        return;
      }

      onAuth(body.access_token);
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-8">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 flex flex-col gap-6">
        <h1
          className="text-3xl font-black text-[#15161A]"
          style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}
        >
          Blurt
        </h1>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 text-sm font-semibold py-1.5 rounded-md transition ${
                mode === m ? "bg-white text-[#15161A] shadow-sm" : "text-[#5C5F6A]"
              }`}
            >
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4B3FE0]/30"
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4B3FE0]/30"
              placeholder={mode === "signup" ? "At least 8 characters" : ""}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 text-sm font-semibold py-2 rounded-lg bg-[#4B3FE0] text-white hover:brightness-110 transition disabled:opacity-50"
          >
            {loading ? "…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
