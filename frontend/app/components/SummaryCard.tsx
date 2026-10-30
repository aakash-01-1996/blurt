"use client";

import { useState } from "react";
import { Summary } from "../types";

export function SummaryCard({ summary }: { summary: Summary }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const res = await fetch(`/api/v1/summaries/${summary.id}/export?format=txt`);
    if (!res.ok) return;
    const text = await res.text();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const url = `/api/v1/summaries/${summary.id}/export?format=md`;
    const a = document.createElement("a");
    a.href = url;
    a.click();
  }

  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#5C5F6A] font-mono">
          Week of {new Date(summary.week_start).toLocaleDateString()}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            .md
          </button>
        </div>
      </div>
      <ul className="flex flex-col gap-1">
        {summary.lines.map((line, i) => (
          <li key={i} className="text-sm text-gray-700 flex gap-2">
            <span className="text-[#4B3FE0] mt-0.5">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
