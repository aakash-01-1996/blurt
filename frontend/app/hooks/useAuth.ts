"use client";

import { useSyncExternalStore } from "react";

const TOKEN_KEY = "blurt_token";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (typeof window !== "undefined") window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", cb);
  };
}

function emit() {
  listeners.forEach((l) => l());
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

// Reads the token from localStorage without a hydration mismatch (server snapshot is null).
export function useAuth() {
  const token = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function login(t: string) {
    try { localStorage.setItem(TOKEN_KEY, t); } catch {}
    emit();
  }

  function logout() {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
    emit();
  }

  return { token, login, logout };
}
