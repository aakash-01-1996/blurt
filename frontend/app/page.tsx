"use client";

import AuthGate from "./auth";
import { AppShell } from "./components/AppShell";
import { useAuth } from "./hooks/useAuth";

export default function Home() {
  const { token, login, logout } = useAuth();
  if (!token) return <AuthGate onAuth={login} />;
  return <AppShell token={token} onLogout={logout} />;
}
