"use client";

import { useState } from "react";

const TOKEN_KEY = "blurt_token";

export function useAuth() {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null
  );

  function login(t: string) {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }

  return { token, login, logout };
}
