"use client";

import { useState } from "react";
import { BrandPanel } from "./components/auth/BrandPanel";
import { AuthForm } from "./components/auth/AuthForm";

interface AuthGateProps {
  onAuth: (token: string) => void;
}

export default function AuthGate({ onAuth }: AuthGateProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="min-h-screen flex bg-surface">
      <BrandPanel mode={mode} />
      <AuthForm mode={mode} onModeChange={setMode} onAuth={onAuth} />
    </div>
  );
}
