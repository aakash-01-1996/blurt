"use client";

import { useState } from "react";
import { Logo } from "./Logo";

type Mode = "login" | "signup";

interface AuthFormProps {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onAuth: (token: string) => void;
}

const INPUT_CLS =
  "w-full text-[15px] border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3]/50 transition placeholder-gray-400";

export function AuthForm({ mode, onModeChange, onAuth }: AuthFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  function switchMode(next: Mode) {
    onModeChange(next);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const endpoint = isSignup ? "/api/v1/auth/signup" : "/api/v1/auth/login";
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
    <div className="flex-1 flex flex-col px-6 sm:px-10 py-8">
      <div className="flex items-center justify-between lg:justify-end gap-2 text-sm">
        <div className="lg:hidden">
          <Logo />
        </div>
        <p className="text-gray-400">
          {isSignup ? "Already have an account? " : "New to Blurt? "}
          <button
            onClick={() => switchMode(isSignup ? "login" : "signup")}
            className="font-bold text-[#0071E3] hover:underline underline-offset-2"
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[420px]">
          <div className="flex gap-1 bg-raised rounded-xl p-1 mb-8">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 text-[15px] font-bold py-2.5 rounded-lg transition ${
                  mode === m ? "bg-surface text-[#1D1D1F] shadow-sm" : "text-[#6E6E73] hover:text-[#1D1D1F]"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <h2 className="font-display text-4xl font-bold text-[#1D1D1F] mb-2">
            {isSignup ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-gray-500 mb-7">
            {isSignup ? "One place for your work log, tasks and lists." : "Sign in to review today's blurts."}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {isSignup && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#1D1D1F]">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} placeholder="Your name" />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#1D1D1F]">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLS}
                placeholder="name@example.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-[#1D1D1F]">Password</label>
                {!isSignup && (
                  <a href="#" className="text-sm font-bold text-[#0071E3] hover:underline underline-offset-2">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${INPUT_CLS} pr-20`}
                  placeholder={isSignup ? "Create a password" : "Enter your password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#1D1D1F] bg-raised hover:bg-[#E8E8ED] rounded-lg px-3 py-1.5 transition"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              {isSignup ? (
                <>
                  <div className="h-1 rounded-full bg-raised overflow-hidden mt-0.5">
                    <div className="h-full bg-[#0071E3] transition-all" style={{ width: `${Math.min(password.length / 12, 1) * 100}%` }} />
                  </div>
                  <p className="text-sm text-gray-400">12 or more characters. A short phrase works well.</p>
                </>
              ) : (
                <label className="flex items-center gap-2.5 mt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-[#D2D2D7] accent-[#0071E3]"
                  />
                  <span className="text-[15px] text-[#6E6E73]">Keep me signed in on this device</span>
                </label>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="text-[15px] font-bold py-3.5 rounded-xl bg-[#1D1D1F] text-white hover:bg-[#2d2f36] active:scale-[0.99] transition disabled:opacity-50"
            >
              {loading ? "…" : isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-sm text-gray-400">or</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={() => setError("Passkeys aren't set up yet — use your email and password for now.")}
            className="w-full flex items-center justify-center gap-2.5 text-[15px] font-bold py-3.5 rounded-xl border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-[#1D1D1F] hover:bg-raised transition"
          >
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
              <circle cx="6" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8.5 8.5L15 15M13 13l1.5-1.5M11.5 11.5L13 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {isSignup ? "Sign up with a passkey" : "Sign in with a passkey"}
          </button>

          {isSignup && (
            <p className="text-sm text-gray-400 mt-5 text-center">
              By creating an account, you agree to the{" "}
              <a href="#" className="font-bold text-[#0071E3] hover:underline">Terms</a> and{" "}
              <a href="#" className="font-bold text-[#0071E3] hover:underline">Privacy Policy</a>.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
        {["Privacy", "Terms", "Help"].map((l) => (
          <a key={l} href="#" className="hover:text-[#1D1D1F] transition">{l}</a>
        ))}
      </div>
    </div>
  );
}
